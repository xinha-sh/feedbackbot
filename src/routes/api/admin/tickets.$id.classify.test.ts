import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  member,
  organization,
  tickets,
  user,
  workspaces,
} from '#/db/schema'
import { newId } from '#/db/ids'
import { createTestDb, type TestDb } from '#/test-helpers/db'

const mocks = vi.hoisted(() => ({
  db: null as ReturnType<typeof createTestDb>['db'] | null,
  getSession: vi.fn(),
  listMembers: vi.fn(),
  classifyQueueSend: vi.fn(),
}))

vi.mock('#/db/client', async () => {
  const actual = await vi.importActual<typeof import('#/db/client')>('#/db/client')
  return { ...actual, makeDb: () => mocks.db! }
})

vi.mock('#/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession, listMembers: mocks.listMembers } },
}))

vi.mock('#/env', () => ({
  env: {
    DB: {},
    BETTER_AUTH_SECRET: 'test',
    CLASSIFY_QUEUE: { send: mocks.classifyQueueSend },
  },
}))

const { Route } = await import('./tickets.$id.classify')

async function call(ticketId: string, domain: string): Promise<Response> {
  const handlers = (Route.options.server as {
    handlers: Record<string, (ctx: { request: Request; params: { id: string } }) => Promise<Response>>
  }).handlers
  const url = `https://t/api/admin/tickets/${ticketId}/classify?domain=${encodeURIComponent(domain)}`
  return handlers.POST({
    request: new Request(url, { method: 'POST' }),
    params: { id: ticketId },
  })
}

describe('reclassify endpoint', () => {
  let testDb: TestDb
  const userId = 'usr_t'
  const orgId = 'org_t'
  const wsId = newId.workspace()
  const ticketId = newId.ticket()
  const domain = 'example.com'

  beforeEach(async () => {
    testDb = createTestDb()
    mocks.db = testDb.db
    mocks.classifyQueueSend.mockReset()
    mocks.classifyQueueSend.mockResolvedValue(undefined)
    mocks.getSession.mockResolvedValue({ user: { id: userId } })
    mocks.listMembers.mockResolvedValue({ members: [{ userId }] })

    await testDb.db.insert(user).values({
      id: userId,
      name: 't',
      email: 't@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAnonymous: false,
    })
    await testDb.db.insert(organization).values({
      id: orgId,
      name: 'org',
      slug: 'org',
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
      id: wsId,
      domain,
      state: 'claimed',
      verificationToken: 'tok',
      betterAuthOrgId: orgId,
      settings: '{}',
      ticketCount: 1,
      createdAt: Date.now(),
      claimedAt: Date.now(),
      plan: 'lite',
      subscriptionId: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      dodoCustomerId: null,
      turnstileSyncedAt: Date.now(),
    })
    await testDb.db.insert(tickets).values({
      id: ticketId,
      workspaceId: wsId,
      message: 'failed to classify earlier',
      pageUrl: null,
      userAgent: null,
      email: null,
      screenshotKey: null,
      ipHash: null,
      status: 'open',
      classification: 'bug', // existing wrong classification
      classificationMeta: '{"summary":"old"}',
      upvotes: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })

  afterEach(() => {
    mocks.db = null
  })

  it('401 unauth', async () => {
    mocks.getSession.mockResolvedValueOnce(null)
    const res = await call(ticketId, domain)
    expect(res.status).toBe(401)
    expect(mocks.classifyQueueSend).not.toHaveBeenCalled()
  })

  it('403 not a member', async () => {
    mocks.listMembers.mockResolvedValueOnce({ members: [{ userId: 'other' }] })
    const res = await call(ticketId, domain)
    expect(res.status).toBe(403)
    expect(mocks.classifyQueueSend).not.toHaveBeenCalled()
  })

  it('404 when ticket id is unknown', async () => {
    const res = await call('tkt_nope', domain)
    expect(res.status).toBe(404)
    expect(mocks.classifyQueueSend).not.toHaveBeenCalled()
  })

  it('clears classification + enqueues', async () => {
    const res = await call(ticketId, domain)
    expect(res.status).toBe(200)

    expect(mocks.classifyQueueSend).toHaveBeenCalledWith({
      ticket_id: ticketId,
      workspace_id: wsId,
    })

    const after = await testDb.db.select().from(tickets)
    expect(after[0].classification).toBeNull()
    expect(after[0].classificationMeta).toBeNull()
    // Status untouched.
    expect(after[0].status).toBe('open')
  })
})
