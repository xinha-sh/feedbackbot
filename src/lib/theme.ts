export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'fb-theme'
export const DEFAULT_THEME: Theme = 'dark'

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // storage disabled; in-memory only
  }
}

export function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

// Runs synchronously in <head> before hydration. Prevents a light-mode
// flash when the user's stored pref is dark (or vice versa).
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'${DEFAULT_THEME}';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='${DEFAULT_THEME}';}})();`
