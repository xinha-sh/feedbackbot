// Tests for /api/onboard/rename's orphan-merge logic — the path
// that lets a paying customer claim a domain even when the widget
// auto-create-on-first-/api/ticket already grabbed it.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import {
  member,
  organization as orgTable,
  tickets,
  user,
  workspaces,
} from '#/db/schema'
import { newId } from '#/db/ids'
import { createTestDb, type TestDb } from '#/test-helpers/db'

const mocks = vi.hoisted(() => ({
  db: null as ReturnType<typeof createTestDb>['db'] | null,
  getSession: vi.fn(),
}))

vi.mock('#/db/client', async () => {
  const actual = await vi.importActual<typeof import('#/db/client')>(
    '#/db/client',
  )
  return {
    ...actual,
    makeDb: () => mocks.db!,
  }
})

vi.mock('#/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock('#/env', () => ({
  env: {
    DB: {},
    BETTER_AUTH_SECRET: 'test',
    HMAC_SECRET_SEED: 'test',
    // Blocklist KV stub: per-test we override .get to flag a
    // domain as freemail/strict; default returns null (nothing
    // blocked) so the email-match path proceeds.
    BLOCKLIST_KV: {
      get: vi.fn(async () => null),
    },
  },
}))

// Imported AFTER vi.mock so the mocks take effect.
const renameModule = await import('./rename')
// The handler isn't exported, so go through the route.
const { Route } = renameModule

async function callRename(body: Record<string, unknown>): Promise<Response> {
  const handlers = (Route.options.server as { handlers: Record<string, (ctx: { request: Request }) => Promise<Response>> }).handlers
  const handler = handlers.POST
  const request = new Request('https://test.dev/api/onboard/rename', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handler({ request })
}

describe('rename — orphan merge', () => {
  let testDb: TestDb
  const userId = 'usr_test'
  const orgId = 'org_paid'
  const paidWsId = newId.workspace()
  const orphanWsId = newId.workspace()

  beforeEach(async () => {
    testDb = createTestDb()
    // D1 has db.batch() for atomic multi-stmt writes; better-sqlite3
    // does not. Polyfill: run each query sequentially. Loses
    // atomicity but tests don't need the FK-failure-recovery
    // semantics — they just need the writes to land.
    ;(testDb.db as unknown as { batch: (qs: Array<Promise<unknown>>) => Promise<Array<unknown>> }).batch = async (queries) => {
      const results = []
      for (const q of queries) results.push(await q)
      return results
    }
    mocks.db = testDb.db
    mocks.getSession.mockResolvedValue({ user: { id: userId } })

    // User row first — member FK requires it.
    await testDb.db.insert(user).values({
      id: userId,
      name: 'tester',
      email: 'tester@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAnonymous: false,
    })

    // Paid workspace + org + member.
    await testDb.db.insert(orgTable).values({
      id: orgId,
      name: 'placeholder',
      slug: 'placeholder',
      createdAt: new Date(),
    })
    await testDb.db.insert(member).values({
      id: 'mem_1',
      organizationId: orgId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })
    await testDb.db.insert(workspaces).values({
      id: paidWsId,
      domain: 'pending-abc.feedbackbot.internal',
      state: 'pending',
      verificationToken: 'tok_paid',
      betterAuthOrgId: orgId,
      settings: '{}',
      ticketCount: 0,
      createdAt: Date.now(),
      claimedAt: null,
      plan: 'lite',
      subscriptionId: 'sub_real',
      subscriptionStatus: 'active',
      currentPeriodEnd: null,
      dodoCustomerId: null,
    })
  })

  async function seedOrphan(opts: {
    ticketCount?: number
    state?: string
    subscriptionId?: string | null
  } = {}) {
    await testDb.db.insert(workspaces).values({
      id: orphanWsId,
      domain: 'peppyhop.com',
      state: opts.state ?? 'pending',
      verificationToken: 'tok_orphan',
      betterAuthOrgId: null,
      settings: '{}',
      ticketCount: opts.ticketCount ?? 0,
      createdAt: Date.now() - 1000,
      claimedAt: null,
      plan: 'free',
      subscriptionId: opts.subscriptionId ?? null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      dodoCustomerId: null,
    })
  }

  it('merges an orphan: tickets + counts re-parent, orphan deleted, paid workspace renamed', async () => {
    await seedOrphan({ ticketCount: 3 })
    // Seed 3 orphan tickets so the FK + count math is real.
    for (let i = 0; i < 3; i++) {
      await testDb.db.insert(tickets).values({
        id: `tkt_${i}`,
        workspaceId: orphanWsId,
        message: `m${i}`,
        pageUrl: null,
        userAgent: null,
        email: null,
        screenshotKey: null,
        ipHash: null,
        status: 'open',
        classification: null,
        classificationMeta: null,
        upvotes: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { workspace_id: string; domain: string }
    expect(body.workspace_id).toBe(paidWsId)
    expect(body.domain).toBe('peppyhop.com')

    // Orphan deleted.
    const allWs = await testDb.db.select().from(workspaces)
    expect(allWs.find((w) => w.id === orphanWsId)).toBeUndefined()

    // Paid workspace renamed + ticket_count bumped.
    const paid = allWs.find((w) => w.id === paidWsId)!
    expect(paid.domain).toBe('peppyhop.com')
    expect(paid.ticketCount).toBe(3)

    // Tickets re-parented.
    const reparented = await testDb.db.select().from(tickets)
    expect(reparented).toHaveLength(3)
    expect(reparented.every((t) => t.workspaceId === paidWsId)).toBe(true)
  })

  it('rejects when the existing workspace has a subscription (real paying customer)', async () => {
    await seedOrphan({ subscriptionId: 'sub_other_customer' })
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('domain_taken')
    // Both workspaces still present — nothing was merged.
    const all = await testDb.db.select().from(workspaces)
    expect(all).toHaveLength(2)
  })

  it('rejects when the existing workspace is already claimed', async () => {
    await seedOrphan({ state: 'claimed' })
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('domain_taken')
  })

  it('plain rename (no existing workspace at the domain) still works', async () => {
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { claimed?: boolean }
    // User email is tester@example.com — doesn't match peppyhop.com,
    // so no auto-claim. Workspace stays pending.
    expect(body.claimed).toBe(false)
    const all = await testDb.db.select().from(workspaces)
    const paid = all.find((w) => w.id === paidWsId)!
    expect(paid.domain).toBe('peppyhop.com')
    expect(paid.state).toBe('pending')
  })
})

describe('rename — email-match auto-claim', () => {
  let testDb: TestDb
  const userIdMatch = 'usr_match'
  const orgIdMatch = 'org_match'
  const paidWsId = newId.workspace()

  beforeEach(async () => {
    testDb = createTestDb()
    ;(testDb.db as unknown as { batch: (qs: Array<Promise<unknown>>) => Promise<Array<unknown>> }).batch = async (queries) => {
      const results = []
      for (const q of queries) results.push(await q)
      return results
    }
    mocks.db = testDb.db
    mocks.getSession.mockResolvedValue({ user: { id: userIdMatch } })

    // Seed the user with an email that matches the target domain.
    await testDb.db.insert(user).values({
      id: userIdMatch,
      name: 'shubham',
      email: 'shubham@peppyhop.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAnonymous: false,
    })
    await testDb.db.insert(orgTable).values({
      id: orgIdMatch,
      name: 'placeholder',
      slug: 'placeholder',
      createdAt: new Date(),
    })
    await testDb.db.insert(member).values({
      id: 'mem_match',
      organizationId: orgIdMatch,
      userId: userIdMatch,
      role: 'owner',
      createdAt: new Date(),
    })
    await testDb.db.insert(workspaces).values({
      id: paidWsId,
      domain: 'pending-xyz.feedbackbot.internal',
      state: 'pending',
      verificationToken: 'tok',
      betterAuthOrgId: orgIdMatch,
      settings: '{}',
      ticketCount: 0,
      createdAt: Date.now(),
      claimedAt: null,
      plan: 'lite',
      subscriptionId: 'sub_real',
      subscriptionStatus: 'active',
      currentPeriodEnd: null,
      dodoCustomerId: null,
    })
  })

  it('auto-claims when session email matches the linked domain', async () => {
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { claimed: boolean; domain: string }
    expect(body.claimed).toBe(true)
    expect(body.domain).toBe('peppyhop.com')

    const ws = (await testDb.db.select().from(workspaces)).find(
      (w) => w.id === paidWsId,
    )!
    expect(ws.state).toBe('claimed')
    expect(ws.claimedAt).not.toBeNull()
  })

  it('auto-claims for subdomain email (alice@app.peppyhop.com → peppyhop.com)', async () => {
    await testDb.db
      .update(user)
      .set({ email: 'alice@app.peppyhop.com' })
      .where(eq(user.id, userIdMatch))
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    const body = (await res.json()) as { claimed: boolean }
    expect(body.claimed).toBe(true)
  })

  it('does NOT auto-claim when email is unverified', async () => {
    await testDb.db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, userIdMatch))
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'peppyhop.com',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { claimed: boolean }
    expect(body.claimed).toBe(false)

    const ws = (await testDb.db.select().from(workspaces)).find(
      (w) => w.id === paidWsId,
    )!
    expect(ws.state).toBe('pending')
  })

  it('does NOT auto-claim for strict TLDs (.edu / .gov)', async () => {
    // Pretend harvard.edu is on the strict blocklist.
    const env = (await import('#/env')).env as unknown as {
      BLOCKLIST_KV: { get: ReturnType<typeof vi.fn> }
    }
    env.BLOCKLIST_KV.get.mockImplementation(async (key: string) => {
      return key === 'strict:harvard.edu' ? '1' : null
    })
    await testDb.db
      .update(user)
      .set({ email: 'student@harvard.edu' })
      .where(eq(user.id, userIdMatch))
    const res = await callRename({
      workspace_id: paidWsId,
      domain: 'harvard.edu',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { claimed: boolean }
    expect(body.claimed).toBe(false)
    env.BLOCKLIST_KV.get.mockReset()
    env.BLOCKLIST_KV.get.mockImplementation(async () => null)
  })
})
