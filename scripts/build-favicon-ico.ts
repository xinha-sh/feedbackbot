// One-shot builder for public/favicon.ico.
//
// Reads /tmp/fav-{16,32,48}.png (produced by `sips` from the SVG)
// and packs them into a valid multi-image ICO file.
//
// ICO layout:
//   ICONDIR            6 bytes (reserved, type, count)
//   ICONDIRENTRY[]    16 bytes per image
//   image payload     PNG bytes
//
// Browsers accept PNG inside ICO (Vista+). We use that because it
// compresses better than raw BMP and every modern agent supports it.

import { readFileSync, writeFileSync } from 'node:fs'

type IconSource = { size: number; path: string }

const sources: Array<IconSource> = [
  { size: 16, path: '/tmp/fav-16.png' },
  { size: 32, path: '/tmp/fav-32.png' },
  { size: 48, path: '/tmp/fav-48.png' },
]

const pngs = sources.map((s) => ({ ...s, data: readFileSync(s.path) }))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type = icon
header.writeUInt16LE(pngs.length, 4) // count

const dirEntrySize = 16
let dataOffset = 6 + dirEntrySize * pngs.length
const entries: Array<Buffer> = []

for (const p of pngs) {
  const entry = Buffer.alloc(dirEntrySize)
  // Width/height: 0 means 256 in ICO spec; our sizes fit in a byte.
  entry.writeUInt8(p.size >= 256 ? 0 : p.size, 0)
  entry.writeUInt8(p.size >= 256 ? 0 : p.size, 1)
  entry.writeUInt8(0, 2) // palette count
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(p.data.length, 8)
  entry.writeUInt32LE(dataOffset, 12)
  entries.push(entry)
  dataOffset += p.data.length
}

const ico = Buffer.concat([
  header,
  ...entries,
  ...pngs.map((p) => p.data),
])

writeFileSync('public/favicon.ico', ico)
console.log(`wrote public/favicon.ico — ${ico.length} bytes, ${pngs.length} sizes`)
