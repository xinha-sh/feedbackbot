// Lazy html2canvas — pulled in on demand so the core widget bundle
// stays under 8kb gzipped (PLAN.md §7.1 + §16).

export async function captureScreenshot(): Promise<string | null> {
  try {
    const mod = await import('html2canvas')
    const html2canvas = mod.default ?? mod
    const canvas = await html2canvas(document.body, {
      logging: false,
      useCORS: true,
      scale: Math.min(window.devicePixelRatio || 1, 2),
    })
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.warn('screenshot capture failed', err)
    return null
  }
}
