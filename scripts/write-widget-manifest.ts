// Post-build step: scan dist/widget for the hashed bundle and write
// a manifest that the loader (cdn.feedback.dev/widget.js) fetches.
//
// Run via: pnpm build:widget && tsx scripts/write-widget-manifest.ts

import { readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const DIST = path.resolve('public/widget')
const CDN_BASE = process.env.FB_WIDGET_CDN_BASE ?? '/widget'

const entries = readdirSync(DIST)
const widgetFile = entries.find(
  (f) => f.startsWith('widget.') && f.endsWith('.js'),
)
if (!widgetFile) {
  console.error('No widget.<hash>.js in', DIST)
  process.exit(1)
}

const manifest = {
  entry: `${CDN_BASE}/${widgetFile}`,
  built_at: new Date().toISOString(),
}

writeFileSync(
  path.join(DIST, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
)
console.log('widget manifest:', manifest)
