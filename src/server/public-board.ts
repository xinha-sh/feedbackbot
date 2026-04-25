// Server function: loads public board data for a workspace. Runs on
// the server (direct D1 access), callable from any route loader
// isomorphically — TanStack Start auto-generates the client RPC.

import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'

import { env } from '#/env'
import { getWorkspaceByDomain, listPublicTickets, makeDb } from '#/db/client'
import { normalizeDomain } from '#/lib/domain'
import {
  ClassificationKindSchema,
  TicketStatusSchema,
  type ClassificationKind,
  type TicketStatus,
} from '#/schema/ticket'

const CACHE_TTL_SECONDS = 30

const PublicBoardTicketSchema = z.object({
  id: z.string(),
  message: z.string(),
  status: TicketStatusSchema,
  classification: ClassificationKindSchema.nullable(),
  suggested_title: z.string().nullable(),
  upvotes: z.number().int().nonnegative(),
  created_at: z.number().int(),
})

const PublicBoardSchema = z.object({
  workspace: z.object({ domain: z.string() }),
  tickets: z.array(PublicBoardTicketSchema),
})

export type PublicBoard = z.infer<typeof PublicBoardSchema>

export const loadPublicBoard = createServerFn({ method: 'GET' })
  .inputValidator((input: { domain: string }) => input)
  .handler(async ({ data }: { data: { domain: string } }): Promise<PublicBoard> => {
    const domain = normalizeDomain(data.domain)
    if (!domain) throw notFound()

    const cacheKey = `pub:tickets:${domain}`
    const cached = await env.CACHE_KV.get(cacheKey)
    if (cached) {
      const parsed = PublicBoardSchema.safeParse(JSON.parse(cached))
      if (parsed.success) return parsed.data
    }

    const db = makeDb(env.DB)
    const workspace = await getWorkspaceByDomain(db, domain)
    if (!workspace || workspace.state !== 'claimed') throw notFound()

    const tickets = await listPublicTickets(db, workspace.id)
    const payload: PublicBoard = {
      workspace: { domain: workspace.domain },
      tickets: tickets.map((t) => ({
        id: t.id,
        message: t.message,
        status: t.status as TicketStatus,
        classification: t.classification as ClassificationKind | null,
        suggested_title: safeTitle(t.classificationMeta),
        upvotes: t.upvotes,
        created_at: t.createdAt,
      })),
    }

    await env.CACHE_KV.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    })
    return payload
  })

function safeTitle(metaJson: string | null): string | null {
  if (!metaJson) return null
  try {
    const parsed = JSON.parse(metaJson) as { suggested_title?: unknown }
    return typeof parsed.suggested_title === 'string'
      ? parsed.suggested_title
      : null
  } catch {
    return null
  }
}
