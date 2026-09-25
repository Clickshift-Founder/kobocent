export type Theme = 'light' | 'dark';

const KEY = 'kobocent-theme';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEY);
  return v === 'dark' || v === 'light' ? v : null;
}

export function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  window.localStorage.setItem(KEY, theme);
}

/** Inlined in <head> to prevent a flash of the wrong theme before hydration. */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var s = localStorage.getItem('${KEY}');
    var d = s ? s === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    if (d) { document.documentElement.classList.add('dark'); }
    document.documentElement.style.colorScheme = d ? 'dark' : 'light';
  } catch(e){}
})();
`;
