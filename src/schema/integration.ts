import { z } from 'zod'
import { ClassificationKindSchema } from './ticket'

// ── integration kinds ────────────────────────────────────────────

export const IntegrationKinds = ['webhook', 'slack', 'discord', 'github'] as const
export const IntegrationKindSchema = z.enum(IntegrationKinds)
export type IntegrationKind = z.infer<typeof IntegrationKindSchema>

// kind-specific credentials — stored encrypted at rest via HKDF-derived
// workspace key (see src/lib/crypto.ts)
const WebhookCreds = z.object({
  kind: z.literal('webhook'),
  url: z.string().url(),
  hmac_secret: z.string().min(16).max(256),
})
const SlackCreds = z.object({
  kind: z.literal('slack'),
  access_token: z.string().min(1),
  team_id: z.string().min(1),
  team_name: z.string().optional(),
})
// Discord incoming webhooks are unauthenticated — the URL itself is
// the secret. We narrow to the canonical Discord webhook host so a
// pasted Slack/random URL fails validation early.
const DiscordCreds = z.object({
  kind: z.literal('discord'),
  webhook_url: z
    .string()
    .url()
    .refine(
      (u) =>
        /^https:\/\/(?:[a-z]+\.)?discord\.com\/api\/webhooks\//.test(u) ||
        /^https:\/\/(?:[a-z]+\.)?discordapp\.com\/api\/webhooks\//.test(u),
      'must be a https://discord.com/api/webhooks/... URL',
    ),
})
// GitHub OAuth-App access tokens are long-lived (no refresh
// rotation), so we only need to store the token + the user's
// login + avatar for the integration display name.
const GitHubCreds = z.object({
  kind: z.literal('github'),
  access_token: z.string().min(1),
  login: z.string().min(1),
  avatar_url: z.string().url().optional(),
  scope: z.string().optional(),
})
export const IntegrationCredsSchema = z.discriminatedUnion('kind', [
  WebhookCreds,
  SlackCreds,
  DiscordCreds,
  GitHubCreds,
])
export type IntegrationCreds = z.infer<typeof IntegrationCredsSchema>

// ── create / update integration ──────────────────────────────────

export const IntegrationCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  creds: IntegrationCredsSchema,
  // optional initial routes — one per classification kind we want to
  // deliver to this integration
  routes: z
    .array(
      z.object({
        ticket_type: ClassificationKindSchema,
        config: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .default([]),
})
export type IntegrationCreate = z.infer<typeof IntegrationCreateSchema>

export const IntegrationPatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  enabled: z.boolean().optional(),
  creds: IntegrationCredsSchema.optional(),
})
export type IntegrationPatch = z.infer<typeof IntegrationPatchSchema>

// ── per-route config shapes ──────────────────────────────────────

export const SlackRouteConfigSchema = z.object({
  channel_id: z.string().min(1),
  channel_name: z.string().optional(),
})
export type SlackRouteConfig = z.infer<typeof SlackRouteConfigSchema>

export const GitHubRouteConfigSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  // Optional comma-separated labels applied to every issue from this
  // route. Empty string means "no labels". Customer-facing UI lets
  // users pick from the repo's existing labels.
  labels: z.array(z.string().min(1)).default([]),
})
export type GitHubRouteConfig = z.infer<typeof GitHubRouteConfigSchema>

// ── outbound webhook payload (generic kind='webhook') ────────────
// This is the public contract customers integrate against. Shape is
// locked by Plan.md §8.2.

export const OutboundTicketPayloadSchema = z.object({
  event: z.literal('ticket.created'),
  workspace: z.object({
    id: z.string(),
    domain: z.string(),
  }),
  ticket: z.object({
    id: z.string(),
    message: z.string(),
    page_url: z.string().nullable(),
    email: z.string().nullable(),
    created_at: z.number().int(),
    classification: z.object({
      primary: ClassificationKindSchema,
      secondary: z.array(ClassificationKindSchema),
      confidence: z.number(),
      summary: z.string(),
      suggested_title: z.string(),
    }),
    screenshot_url: z.string().url().optional(),
  }),
  delivery: z.object({
    id: z.string(),
    attempt: z.number().int().nonnegative(),
  }),
})
export type OutboundTicketPayload = z.infer<typeof OutboundTicketPayloadSchema>
