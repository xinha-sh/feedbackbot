// GET /api/admin/integrations/:id/github-repos?domain=<d>
// Decrypts the stored GitHub token and lists repos the user has
// write access to. Used by the integrations-page repo picker.

import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { getIntegration } from '#/db/client'
import {
  b64ToBytes,
  decryptCredentials,
  deriveWorkspaceKey,
} from '#/lib/crypto'
import {
  ApiError,
  apiError,
  corsHeadersFor,
  json,
  optionsResponse,
} from '#/lib/http'
import { withRequestMetrics } from '#/lib/analytics'
import { requireAdminWorkspace } from '#/lib/admin-auth'
import { IntegrationCredsSchema } from '#/schema/integration'
import { listAccessibleRepos } from '#/integrations-core/github/repos'

async function handle(
  request: Request,
  integrationId: string,
): Promise<Response> {
  const cors = corsHeadersFor(request)
  try {
    const { workspace, db } = await requireAdminWorkspace(request)

    const integration = await getIntegration(db, workspace.id, integrationId)
    if (!integration) throw new ApiError(404, 'no integration', 'no_integration')
    if (integration.kind !== 'github') {
      throw new ApiError(400, 'not a github integration', 'wrong_kind')
    }

    const masterKey = b64ToBytes(env.INTEGRATIONS_ENCRYPTION_KEY)
    const wsKey = await deriveWorkspaceKey(masterKey, workspace.id)
    const decrypted = await decryptCredentials<unknown>(
      wsKey,
      integration.credentials,
    )
    const creds = IntegrationCredsSchema.safeParse(decrypted)
    if (!creds.success || creds.data.kind !== 'github') {
      throw new ApiError(500, 'bad creds on file', 'bad_creds')
    }

    const result = await listAccessibleRepos(creds.data.access_token)
    if (!result.ok) {
      // 401 from GitHub typically means the user revoked the
      // token. Surface that so the dashboard can prompt re-install.
      const status = result.status === 401 ? 401 : 502
      throw new ApiError(status, result.error, 'github_api_error')
    }
    return json({ repos: result.repos }, { headers: cors })
  } catch (err) {
    const res = apiError(err)
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  }
}

const listRepos = withRequestMetrics(
  '/api/admin/integrations/:id/github-repos',
  handle,
)

export const Route = createFileRoute(
  '/api/admin/integrations/$id/github-repos',
)({
  server: {
    handlers: {
      OPTIONS: ({ request }) => optionsResponse(request),
      GET: async ({ request, params }) =>
        listRepos(request as Request, params.id),
    },
  },
})
