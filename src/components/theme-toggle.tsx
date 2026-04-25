import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyTheme, readStoredTheme, type Theme } from '#/lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(readStoredTheme())
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  // During SSR / first client render, render a placeholder shaped the
  // same as the final button so layout doesn't shift.
  const current: Theme = theme ?? 'dark'
  const Icon = current === 'dark' ? Sun : Moon
  const label = current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="hi-btn hi-btn-sm hi-btn-ghost hi-focus"
    >
      <Icon size={14} strokeWidth={1.75} />
    </button>
  )
}
