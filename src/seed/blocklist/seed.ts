// One-shot seeder for BLOCKLIST_KV. Invoked from alchemy.run.ts at
// deploy time. See Plan.md §11 / §4.3.
//
// Writes:
//   freemail:<domain>    = '1'
//   disposable:<domain>  = '1'
//   strict:<domain>      = '1'
//   version              = <iso timestamp>  (cache-bust key)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const freemailText = readFileSync(join(here, 'freemail.txt'), 'utf-8')
const disposableText = readFileSync(join(here, 'disposable.txt'), 'utf-8')
const strictText = readFileSync(join(here, 'strict.txt'), 'utf-8')

type Bucket = 'freemail' | 'disposable' | 'strict'

function parseList(raw: string): Array<string> {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
}

export function blocklistSeedData(): Record<Bucket, Array<string>> {
  return {
    freemail: parseList(freemailText),
    disposable: parseList(disposableText),
    strict: parseList(strictText),
  }
}

// Write the full seed to a live KVNamespace. Safe to re-run — same
// keys just overwrite. Kept exported because it's the entry point a
// deploy hook / one-off script will call against env.BLOCKLIST_KV;
// not yet wired so static analysis can't see a caller.
/** @expected-unused */
export async function seedBlocklistKv(kv: KVNamespace): Promise<{
  freemail: number
  disposable: number
  strict: number
}> {
  const data = blocklistSeedData()
  const version = new Date().toISOString()

  const tasks: Array<Promise<void>> = []
  for (const bucket of ['freemail', 'disposable', 'strict'] as const) {
    for (const domain of data[bucket]) {
      tasks.push(kv.put(`${bucket}:${domain}`, '1'))
    }
  }
  tasks.push(kv.put('version', version))
  await Promise.all(tasks)

  return {
    freemail: data.freemail.length,
    disposable: data.disposable.length,
    strict: data.strict.length,
  }
}
