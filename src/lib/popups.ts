/**
 * One popup per visit (founder, 2026-11-03). A visit = one tab / app session. The setup prompt (PIN + security questions)
 * goes first and shows on every visit until both are set; "connect Telegram", "add Google" and What's new then wait for a
 * later visit. Not counted: the one-time first tour, and the tip that explains a feature when someone opens it.
 */
const KEY = 'kc-popup-visit';
let ready = false;

/** SecurityProvider calls this once it knows whether the setup prompt is due, so nothing else jumps ahead of it. */
export const markPopupsReady = () => { ready = true; };
export const popupsReady = () => ready;

/** True if this popup may show on this visit (and claims the visit for it). */
export function takePopup(kind: string): boolean {
  try {
    const current = window.sessionStorage.getItem(KEY);
    if (current && current !== kind) return false;
    window.sessionStorage.setItem(KEY, kind);
    return true;
  } catch { return true; }
}
