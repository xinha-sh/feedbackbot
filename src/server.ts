// Main Worker entrypoint — re-exports TanStack Start's server
// handler. DO classes now live on a dedicated `dos-worker`
// (src/workers/dos.ts) because TanStack Start's build pipeline
// doesn't surface extra exports from this file.

export { default } from '@tanstack/react-start/server-entry'
