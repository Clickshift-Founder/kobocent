'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kc } from '@/lib/kc';
import { Sheet } from './ui';
import { IconBell } from './Icons';

/**
 * Notifications bell (2026-10-06). The backend (GET /notifications) lists what the user should finish
 * or know — set a PIN, connect Telegram, add Google, a reply from support, a payment under review —
 * each with a button to do it. The badge counts what's left; dismissible items can be hidden.
 * Hidden until the backend answers, so web and backend can deploy in either order.
 */
interface Item { id: string; tone: 'action' | 'message' | 'info'; title: string; body: string; at?: number | null; dismissible?: boolean; action?: { label: string; href?: string; event?: string } }

const DISMISSED = 'kc-notif-dismissed';
const SEEN = 'kc-notif-seen';
const readSet = (k: string) => { try { return new Set<string>(JSON.parse(localStorage.getItem(k) || '[]')); } catch { return new Set<string>(); } };
const writeSet = (k: string, s: Set<string>) => { try { localStorage.setItem(k, JSON.stringify(Array.from(s).slice(-200))); } catch { /* private mode */ } };

export function NotificationsBell({ label }: { label?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try { setItems((await kc<{ items: Item[] }>('notifications')).items); } catch { /* backend without the bell yet */ }
  }, []);
  useEffect(() => {
    setDismissed(readSet(DISMISSED)); setSeen(readSet(SEEN));
    load();
    const t = setInterval(load, 60_000);
    const again = () => load();
    window.addEventListener('kc-security-changed', again);
    window.addEventListener('focus', again);
    return () => { clearInterval(t); window.removeEventListener('kc-security-changed', again); window.removeEventListener('focus', again); };
  }, [load]);

  if (items === null) return null;
  const visible = items.filter(i => !dismissed.has(i.id));
  const unseen = visible.filter(i => !seen.has(i.id)).length;

  const openSheet = () => {
    setOpen(true);
    const next = new Set(seen); visible.forEach(i => next.add(i.id)); setSeen(next); writeSet(SEEN, next);
  };
  const dismiss = (id: string) => { const next = new Set(dismissed); next.add(id); setDismissed(next); writeSet(DISMISSED, next); };
  const act = (i: Item) => {
    setOpen(false);
    // Let the sheet close (and its history entry go) before opening the next thing.
    setTimeout(() => {
      if (i.action?.event) window.dispatchEvent(new Event(i.action.event));
      else if (i.action?.href) router.push(i.action.href);
    }, 60);
  };

  return (
    <>
      <button onClick={openSheet} aria-label={visible.length ? `Notifications, ${visible.length} waiting` : 'Notifications'}
        className={label ? 'relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-warmgray dark:text-warmgray-dark hover:bg-cream-warm dark:hover:bg-night-card'
          : 'relative grid place-items-center h-11 w-11 rounded-xl text-ink dark:text-cream-warm hover:bg-cream-warm dark:hover:bg-night-card'}>
        <IconBell size={label ? 20 : 22} />{label}
        {visible.length > 0 && (
          <span className={`${label ? 'ml-auto' : 'absolute top-1.5 right-1.5'} min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold grid place-items-center text-white ${unseen ? 'bg-[#B84A40]' : 'bg-warmgray'}`}>{visible.length}</span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        {visible.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-[#58834C]/12 text-[#58834C]"><IconBell size={26} /></div>
            <p className="mt-3 font-semibold text-ink dark:text-cream-warm">You&apos;re all caught up</p>
            <p className="muted text-[14px] mt-1">We&apos;ll let you know when something needs you.</p>
          </div>
        ) : (
          <ul className="space-y-3 pb-2">
            {visible.map(i => (
              <li key={i.id} className={`rounded-2xl p-4 border ${i.tone === 'message' ? 'border-terracotta/40 bg-terracotta-soft' : 'border-cream-border dark:border-night-border bg-white dark:bg-night-card'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i.tone === 'message' ? 'bg-terracotta' : i.tone === 'action' ? 'bg-[#B68B2A]' : 'bg-[#58834C]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[15px] text-ink dark:text-cream-warm">{i.title}</p>
                    <p className="muted text-[14px] mt-0.5 leading-relaxed break-words">{i.body}</p>
                    <div className="mt-3 flex items-center gap-3">
                      {i.action && <button onClick={() => act(i)} className="btn-primary min-h-[44px] px-4 text-[14px]">{i.action.label}</button>}
                      {i.dismissible && <button onClick={() => dismiss(i.id)} className="text-[14px] muted min-h-[44px] px-2">Not now</button>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
