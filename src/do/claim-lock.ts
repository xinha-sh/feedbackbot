// Serializes workspace-claim attempts so two same-domain users can't
// both become `owner`. One DO per workspace domain. PLAN.md §6.
//
// `acquire` returns true only to the very first caller. Subsequent
// callers receive `false` + the id of the first owner, so they can
// be added as `member` instead.

export class ClaimLock {
  constructor(private state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/acquire' && req.method === 'POST') {
      const { userId } = (await req.json()) as { userId: string }
      const existing = await this.state.storage.get<string>('owner')
      if (existing) {
        return Response.json({ acquired: false, owner_user_id: existing })
      }
      await this.state.storage.put('owner', userId)
      return Response.json({ acquired: true, owner_user_id: userId })
    }
    if (url.pathname === '/owner' && req.method === 'GET') {
      const owner = (await this.state.storage.get<string>('owner')) ?? null
      return Response.json({ owner_user_id: owner })
    }
    return new Response('not found', { status: 404 })
  }
}

export async function acquireClaimLock(
  ns: DurableObjectNamespace,
  workspaceDomain: string,
  userId: string,
): Promise<{ acquired: boolean; owner_user_id: string }> {
  const id = ns.idFromName(workspaceDomain)
  const stub = ns.get(id)
  const res = await stub.fetch('https://cl/acquire', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
  return res.json()
}
