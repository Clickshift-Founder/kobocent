export type Theme = 'light' | 'dark';

const KEY = 'kobocent-theme';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEY);
  return v === 'dark' || v === 'light' ? v : null;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  window.localStorage.setItem(KEY, theme);
}

/**
 * Inlined in <head> so the correct theme paints on the first frame.
 *
 * Light is the brand default and wins unless the visitor has explicitly
 * chosen dark here before. We deliberately do NOT fall back to the OS
 * setting: a large share of people run their phone in dark mode, which
 * would mean most first-time visitors never see the intended brand.
 */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var s = localStorage.getItem('${KEY}');
    var dark = s === 'dark';
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch(e){}
})();
`;
