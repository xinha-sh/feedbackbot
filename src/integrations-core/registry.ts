// Per-kind dispatch + metadata registry for integrations.
//
// Each integration lives in its own folder under
// src/integrations-core/<kind>/ with:
//   - dispatch.ts  : the Dispatcher.dispatch() logic
//   - manifest.ts  : display metadata (name, icon, docs, setup flow)
//   - oauth.ts     : OAuth install handlers (if setup === 'oauth')
//   - schema.ts    : Zod schemas for creds + per-route config (if
//                    not shared with src/schema/integration.ts)
//   - index.ts     : calls registerIntegration(...) — the entry
//                    that src/integrations-core/index.ts imports
//
// Add a new integration by creating a sibling folder, wiring its
// index.ts to registerIntegration, and importing from the top-level
// registry barrel.

import type { IntegrationKind, IntegrationCreds, OutboundTicketPayload } from '#/schema/integration'

export type DispatchResult = {
  ok: boolean
  responseCode: number | null
  responseBody: string | null
  requestBody: string
  error?: string
}

export interface IntegrationDispatcher {
  kind: IntegrationKind
  dispatch(input: {
    creds: IntegrationCreds
    routeConfig: unknown
    payload: OutboundTicketPayload
    hmacSeed: string
  }): Promise<DispatchResult>
}

// Admin-UI-facing metadata. Rendered on the integrations page to
// drive the install button, description, and routing UI.
export interface IntegrationManifest {
  kind: IntegrationKind
  displayName: string
  tagline: string
  // 'oauth' = "Install" button initiates an OAuth redirect.
  // 'manual' = admin fills in a form (URL + HMAC secret, etc.).
  setup: 'oauth' | 'manual'
  docsUrl?: string
  // SVG markup inlined at render — keep it small. Null = no icon.
  iconSvg?: string
}

const dispatchers = new Map<IntegrationKind, IntegrationDispatcher>()
const manifests = new Map<IntegrationKind, IntegrationManifest>()

export function registerIntegration(
  dispatcher: IntegrationDispatcher,
  manifest: IntegrationManifest,
) {
  dispatchers.set(dispatcher.kind, dispatcher)
  manifests.set(manifest.kind, manifest)
}

export function getDispatcher(kind: IntegrationKind): IntegrationDispatcher {
  const d = dispatchers.get(kind)
  if (!d) throw new Error(`no dispatcher for integration kind: ${kind}`)
  return d
}

export function getManifest(kind: IntegrationKind): IntegrationManifest {
  const m = manifests.get(kind)
  if (!m) throw new Error(`no manifest for integration kind: ${kind}`)
  return m
}

export function listManifests(): Array<IntegrationManifest> {
  return Array.from(manifests.values())
}
