// Lists repos the integration's stored token can write to. Used by
// the per-route config UI so the customer picks {owner, repo} from
// a dropdown instead of typing it.
//
// GitHub doesn't expose "repos with issue-write" directly; we list
// repos the token's user has at least 'push' permission on, which
// implies issue-write. We page up to 3 pages × 100 = 300 repos to
// keep the latency cap predictable.

const PER_PAGE = 100
const MAX_PAGES = 3

export type GitHubRepo = {
  full_name: string
  name: string
  owner: string
  private: boolean
  archived: boolean
  has_issues: boolean
  description: string | null
}

export async function listAccessibleRepos(
  accessToken: string,
): Promise<{ ok: true; repos: Array<GitHubRepo> } | { ok: false; error: string; status?: number }> {
  const repos: Array<GitHubRepo> = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL('https://api.github.com/user/repos')
    url.searchParams.set('per_page', String(PER_PAGE))
    url.searchParams.set('page', String(page))
    // 'updated' surfaces actively-maintained repos first, which is
    // what the customer is most likely to want to file issues to.
    url.searchParams.set('sort', 'updated')
    url.searchParams.set(
      'affiliation',
      'owner,collaborator,organization_member',
    )
    const res = await fetch(url.toString(), {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'FeedbackBot/1.0',
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text.slice(0, 200) || `HTTP ${res.status}` }
    }
    const batch = (await res.json()) as Array<{
      full_name?: string
      name?: string
      owner?: { login?: string }
      private?: boolean
      archived?: boolean
      has_issues?: boolean
      description?: string | null
      permissions?: { push?: boolean }
    }>
    for (const r of batch) {
      // Skip archived (can't open issues) and repos where issues
      // are disabled in settings.
      if (!r.full_name || !r.name || !r.owner?.login) continue
      if (r.archived) continue
      if (r.has_issues === false) continue
      // permissions.push implies write access; if absent (which
      // happens for a few endpoint shapes), assume true and let
      // the create-issue call surface the 403 if any.
      if (r.permissions && r.permissions.push === false) continue
      repos.push({
        full_name: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: !!r.private,
        archived: !!r.archived,
        // We continued above on `has_issues === false`; if the field
        // was missing, we kept the row (default-true assumption).
        has_issues: true,
        description: r.description ?? null,
      })
    }
    if (batch.length < PER_PAGE) break
  }
  return { ok: true, repos }
}
