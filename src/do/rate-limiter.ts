// Per-IP sliding-window rate limiter. One DO instance per hashed IP.
// PLAN.md §11: 20 submissions / IP / hour.

const WINDOW_MS = 60 * 60 * 1000 // 1h
const LIMIT = 20

export class RateLimiter {
  private timestamps: Array<number> = []
  private loaded = false

  constructor(private state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/check' && req.method === 'POST') {
      const result = await this.check()
      return Response.json(result)
    }
    return new Response('not found', { status: 404 })
  }

  private async load() {
    if (this.loaded) return
    const stored = await this.state.storage.get<Array<number>>('ts')
    this.timestamps = stored ?? []
    this.loaded = true
  }

  private async check(): Promise<{ allowed: boolean; remaining: number; reset_ms: number }> {
    await this.load()
    const now = Date.now()
    const cutoff = now - WINDOW_MS
    this.timestamps = this.timestamps.filter((t) => t > cutoff)

    if (this.timestamps.length >= LIMIT) {
      const oldest = this.timestamps[0] ?? now
      return {
        allowed: false,
        remaining: 0,
        reset_ms: oldest + WINDOW_MS - now,
      }
    }

    this.timestamps.push(now)
    await this.state.storage.put('ts', this.timestamps)
    // GC: DO can live forever; set an alarm to clean up if idle.
    await this.state.storage.setAlarm(now + WINDOW_MS + 60_000)

    return {
      allowed: true,
      remaining: LIMIT - this.timestamps.length,
      reset_ms: WINDOW_MS,
    }
  }

  async alarm() {
    await this.load()
    const cutoff = Date.now() - WINDOW_MS
    this.timestamps = this.timestamps.filter((t) => t > cutoff)
    if (this.timestamps.length === 0) {
      await this.state.storage.deleteAll()
    } else {
      await this.state.storage.put('ts', this.timestamps)
    }
  }
}

// ── client helper ────────────────────────────────────────────────

export async function checkIpRate(
  ns: DurableObjectNamespace,
  ipHash: string,
): Promise<{ allowed: boolean; remaining: number; reset_ms: number }> {
  const id = ns.idFromName(ipHash)
  const stub = ns.get(id)
  const res = await stub.fetch('https://rl/check', { method: 'POST' })
  return res.json()
}
