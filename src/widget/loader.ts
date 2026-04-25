// Short-cache bootstrap — this file is served at cdn.usefeedbackbot.com/widget.js
// with a short cache (minutes). It reads the current hashed-bundle URL
// and imports it. Keeps customer-cached HTML snippets pointing at
// /widget.js forever while we roll out new bundles under new hashes.
//
// The MANIFEST is rewritten at each deploy with the new hashed URL.

const MANIFEST = '__FB_WIDGET_MANIFEST_URL__' // replaced at build time

void (async () => {
  try {
    const res = await fetch(MANIFEST, { cache: 'no-cache' })
    const { entry } = (await res.json()) as { entry: string }
    await import(/* @vite-ignore */ entry)
  } catch (err) {
    console.warn('feedbackbot: widget load failed', err)
  }
})()
