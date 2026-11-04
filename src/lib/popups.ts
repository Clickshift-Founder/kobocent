/**
 * What pops up, in what order (founder, 2026-11-04). A visit = one tab / app session.
 *  1. First-time users: the tour, once. It can be skipped and never comes back on its own.
 *  2. PIN + security questions: every visit until both are set, after the tour.
 *  3. New features: one per visit, after the setup prompt, until all are seen, then never again.
 *  4. "Connect Telegram" / "add Google": only on a visit with nothing above left to show.
 * The tip that explains a feature when someone opens it is separate and shows once per feature.
 */
const KEY = 'kc-popup-visit';
let ready = false;
let guide: { tourPending: boolean; newsPending: boolean } | null = null;

/** SecurityProvider calls this once it knows whether the setup prompt is due, so nothing else jumps ahead of it. */
export const markPopupsReady = () => { ready = true; };
export const popupsReady = () => ready;

/** GuideProvider says what it still has to show. SecurityProvider waits for this. */
export function setGuideState(next: { tourPending: boolean; newsPending: boolean }) {
  guide = next;
  window.dispatchEvent(new Event('kc-guide-state'));
}
export const guideKnown = () => guide !== null;
export const tourPending = () => !!guide?.tourPending;
export const newsPending = () => !!guide?.newsPending;

/** True if this optional popup may show on this visit (and claims the visit for it). The setup prompt never needs this. */
export function takePopup(kind: string): boolean {
  try {
    const current = window.sessionStorage.getItem(KEY);
    if (current && current !== kind) return false;
    window.sessionStorage.setItem(KEY, kind);
    return true;
  } catch { return true; }
}
