// Widget-only Vite build. Run via `pnpm build:widget`.
// Outputs a single hashed bundle to dist/widget/widget.<hash>.js
// plus a tiny loader entry.

import { defineConfig } from 'vite'

// API_BASE is baked at build time — set via VITE_FB_API_BASE env var.
const API_BASE = process.env.VITE_FB_API_BASE ?? 'https://feedback.dev'
const WIDGET_MANIFEST = process.env.VITE_FB_WIDGET_MANIFEST ??
  'https://cdn.feedback.dev/widget/manifest.json'

export default defineConfig({
  build: {
    // Emit into public/widget/ so TanStack Start's static handler
    // serves the bundle from the main app worker at /widget/*.
    // Deferred: dedicated cdn.feedback.dev subdomain + R2 mirror.
    outDir: 'public/widget',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        widget: 'src/widget/index.ts',
        loader: 'src/widget/loader.ts',
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'loader' ? 'loader.js' : 'widget.[hash].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        format: 'es',
      },
    },
    reportCompressedSize: true,
  },
  define: {
    __FB_API_BASE__: JSON.stringify(API_BASE),
    __FB_WIDGET_MANIFEST_URL__: JSON.stringify(WIDGET_MANIFEST),
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
})
