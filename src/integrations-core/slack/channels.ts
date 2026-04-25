// Slack conversations.list — minimal wrapper used by the admin UI
// to populate the channel picker after install.

const CONVERSATIONS_LIST = 'https://slack.com/api/conversations.list'

export type SlackChannel = {
  id: string
  name: string
  is_private: boolean
  is_archived: boolean
  is_member: boolean
}

type SlackResponse = {
  ok: boolean
  error?: string
  channels?: Array<{
    id: string
    name: string
    is_private?: boolean
    is_archived?: boolean
    is_member?: boolean
  }>
  response_metadata?: { next_cursor?: string }
}

export async function listSlackChannels(
  botToken: string,
): Promise<Array<SlackChannel>> {
  const all: Array<SlackChannel> = []
  let cursor: string | undefined

  // Walk pagination up to 5 pages (5 × 200 = 1000 channels) — plenty
  // for MVP, bail out beyond that.
  for (let i = 0; i < 5; i++) {
    const u = new URL(CONVERSATIONS_LIST)
    u.searchParams.set('limit', '200')
    u.searchParams.set('types', 'public_channel,private_channel')
    u.searchParams.set('exclude_archived', 'true')
    if (cursor) u.searchParams.set('cursor', cursor)

    const res = await fetch(u, {
      headers: { authorization: `Bearer ${botToken}` },
    })
    const body = (await res.json()) as SlackResponse
    if (!body.ok || !body.channels) {
      throw new Error(`slack ${body.error ?? 'unknown'}`)
    }
    for (const c of body.channels) {
      if (c.is_archived) continue
      all.push({
        id: c.id,
        name: c.name,
        is_private: !!c.is_private,
        is_archived: !!c.is_archived,
        is_member: !!c.is_member,
      })
    }
    cursor = body.response_metadata?.next_cursor
    if (!cursor) break
  }

  all.sort((a, b) => a.name.localeCompare(b.name))
  return all
}
