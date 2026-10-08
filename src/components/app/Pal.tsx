'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { kc, KcError, BOT_URL } from '@/lib/kc';
import { newKey, HoldToConfirm } from './money';
import { IconClose, IconSend, IconChevron } from './Icons';
import { usePayFrom, PayFromPicker } from './PayFrom';

/**
 * Kobo Pal in the web app (2026-10-05) — the same assistant as Telegram (backend src/services/assistant.js).
 *  - Free answers every day; Pal VIP (a more capable model) unlocked by tipping Pal in USDC.
 *  - "Talk to a person": the chat becomes a support case; an agent from the team joins with their name.
 * Opened from the header on every screen (never a floating bubble over buttons). Full screen on phones.
 */

interface Tier { usd: number; title: string; perks: string; credit: number; answers: number }
interface PalState { credit: number; creditPct: number; answersLeft: number; vip: boolean; priority: boolean; freeLeft: number; freePerDay: number; tipShare: number; tips: Tier[]; openCase: boolean;
  case: SupportCase | null; messages: SupportMsg[] }
interface SupportCase { id: number; status: 'waiting' | 'active' | 'closed'; agentName: string | null; reason: string | null; closedBy: string | null; resolution: string | null; rating: number | null }
interface SupportMsg { id: number; sender: 'user' | 'agent' | 'pal' | 'system'; agentName: string | null; body: string; at: number }
interface ChatMsg { id: string; from: 'user' | 'pal' | 'agent' | 'system'; text: string; name?: string | null; actions?: string[]; tier?: string }
interface ChatRes { reply: string | null; tier: string; actions: string[]; caseId: number | null; routedToCase: boolean; credit: number | null; freeLeft: number | null; limited: string | null }
interface Job { id: string; status: 'running' | 'done'; result: null | { ok: boolean; code?: string; error?: string; amount?: number; creditAdded?: number; credit?: number; answersLeft?: number; signature?: string; explorerUrl?: string | null; paidFrom?: string } }

const SCREENS: Record<string, { label: string; href: string; external?: boolean }> = {
  add_money: { label: 'Add money', href: '/app/add-money' }, send_bank: { label: 'Send to bank', href: '/app/send' },
  withdraw: { label: 'Withdraw', href: '/app/withdraw' }, bills: { label: 'Pay bills', href: '/app/bills' },
  swap: { label: 'Swap', href: '/app/swap' }, send_wallet: { label: 'Send to wallet', href: '/app/send-wallet' },
  bridge: { label: 'Bridge', href: '/app/bridge' }, earn: { label: 'Earn', href: '/app/earn' },
  activity: { label: 'Activity', href: '/app/activity' }, rewards: { label: 'Rewards', href: '/app/rewards' },
  settings: { label: 'Settings', href: '/app/settings' }, telegram: { label: 'Open in Telegram', href: BOT_URL, external: true },
};
const STARTERS = ['What can you do for me?', 'How do I pay electricity?', 'Best Earn plan for my idle cash?', 'Is my last payment done?'];
const STORE = 'kc-pal-chat';
const loadChat = (): ChatMsg[] => { try { return JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { return []; } };
const saveChat = (m: ChatMsg[]) => { try { sessionStorage.setItem(STORE, JSON.stringify(m.slice(-40))); } catch { /* private mode */ } };

export function IconPal({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" />
      <path d="M12 6.8l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Light formatting: *bold*, _italic_, `code`, line breaks — escaped first. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g);
  return (
    <>{parts.map((p, i) => {
      if (/^\*[^*]+\*$/.test(p)) return <b key={i}>{p.slice(1, -1)}</b>;
      if (/^_[^_]+_$/.test(p)) return <i key={i}>{p.slice(1, -1)}</i>;
      if (/^`[^`]+`$/.test(p)) return <code key={i} className="font-mono text-[13px] px-1 rounded bg-black/5 dark:bg-white/10">{p.slice(1, -1)}</code>;
      return <span key={i}>{p}</span>;
    })}</>
  );
}

function Initials({ name }: { name: string | null | undefined }) {
  const n = (name || 'Support').trim();
  const ini = n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-ink text-cream-warm dark:bg-cream-warm dark:text-ink text-[12px] font-semibold">{ini}</span>;
}

/** Open Kobo Pal from anywhere; with `prompt`, Pal is asked it straight away (failure screens, 2026-10-07). */
export function askPal(prompt?: string) {
  window.dispatchEvent(new CustomEvent('kc-open-pal', { detail: { prompt } }));
}

/** "Ask Kobo Pal" under a failure message: Pal gets the message and explains what to do next. */
export function AskPalButton({ about, className = '' }: { about?: string; className?: string }) {
  const prompt = about ? `I just got this message in Kobocent: "${about.slice(0, 600)}". What happened, and what should I do now?` : undefined;
  return (
    <button type="button" onClick={() => askPal(prompt)}
      className={`inline-flex items-center gap-2 min-h-[44px] px-1 text-[14px] font-semibold text-terracotta hover:text-terracotta-dark ${className}`}>
      <IconPal size={18} />Ask Kobo Pal
    </button>
  );
}

export function PalButton({ className = '', label }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState<string | undefined>(undefined);
  const [dot, setDot] = useState(false);
  const [available, setAvailable] = useState(false);   // hidden until the backend has Pal (deploys can land in either order)
  // A reply from support while the panel is closed → a dot on the button.
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try { const s = await kc<PalState>('pal'); if (!live) return; setAvailable(true); const last = s.messages.at(-1); setDot(!!s.case && s.case.status !== 'closed' && last?.sender === 'agent' && Number(localStorage.getItem('kc-pal-seen') || 0) < last.at); }
      catch { /* not signed in yet / backend without Pal */ }
    };
    tick();
    // Tapped a "support replied" notification → /app?pal=1 opens the chat (only the visible button).
    try {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      if (new URLSearchParams(window.location.search).get('pal') === '1' && !!label === desktop) setOpen(true);
    } catch { /* ignore */ }
    const t = setInterval(tick, 60_000);
    const onOpen = (e: Event) => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      if (!!label !== desktop) return;
      setAsk((e as CustomEvent<{ prompt?: string }>).detail?.prompt);
      setOpen(true);
    };
    window.addEventListener('kc-open-pal', onOpen);
    return () => { live = false; clearInterval(t); window.removeEventListener('kc-open-pal', onOpen); };
  }, [label]);
  if (!available) return null;
  return (
    <>
      <button onClick={() => { setAsk(undefined); setOpen(true); setDot(false); }} aria-label="Ask Kobo Pal" data-tour="pal"
        className={label ? `relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-terracotta hover:bg-terracotta-soft ${className}`
          : `relative grid place-items-center h-11 w-11 rounded-xl text-terracotta hover:bg-terracotta-soft ${className}`}>
        <IconPal />{label}
        {dot && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-[#B84A40] ring-2 ring-cream dark:ring-night" />}
      </button>
      {/* Portal: the phone header's backdrop blur would otherwise trap a fixed panel inside it. */}
      {open && typeof document !== 'undefined' && createPortal(<PalPanel ask={ask} onClose={() => { setOpen(false); setAsk(undefined); }} />, document.body)}
    </>
  );
}

function PalPanel({ onClose, ask }: { onClose: () => void; ask?: string }) {
  const [state, setState] = useState<PalState | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState(ask || '');   // shown at once; sent as soon as Pal has loaded (below)
  const asked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [view, setView] = useState<'chat' | 'tip'>('chat');
  const endRef = useRef<HTMLDivElement>(null);
  const lastSupportId = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const router = useRouter();
  // Going to a screen from Pal: the destination REPLACES Pal's history entry, so closing does not step
  // back over it (2026-10-06: buttons landed on Home because that step-back raced the navigation).
  const leaving = useRef(false);
  const go = (href: string) => { leaving.current = true; router.replace(href); onClose(); };

  // Back button closes the panel; Escape too; page behind doesn't scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Own history entry; the PIN sheet stepping back onto it must not close Pal (tip success was lost).
    const id = `pal${Date.now()}`;
    let popped = false;
    const onPop = () => { if (window.history.state?.kcSheet === id) return; popped = true; closeRef.current(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && document.querySelectorAll('[role="dialog"]').length <= 1) closeRef.current(); };
    try { window.history.pushState({ ...(window.history.state || {}), kcSheet: id }, ''); } catch { /* ignore */ }
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    setMsgs(loadChat());
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      if (!popped && !leaving.current) { try { if (window.history.state?.kcSheet === id) window.history.back(); } catch { /* ignore */ } }
    };
  }, []);

  const mergeSupport = useCallback((s: { case: SupportCase | null; messages: SupportMsg[] }) => {
    const fresh = s.messages.filter(m => m.id > lastSupportId.current && m.sender !== 'user' && m.sender !== 'pal');
    if (s.messages.length) lastSupportId.current = Math.max(lastSupportId.current, ...s.messages.map(m => m.id));
    if (s.messages.length) { const last = s.messages.at(-1)!; try { localStorage.setItem('kc-pal-seen', String(last.at)); } catch { /* ignore */ } }
    if (!fresh.length) return;
    setMsgs(prev => {
      const next = [...prev, ...fresh.map(m => ({ id: `s${m.id}`, from: m.sender as ChatMsg['from'], text: m.body, name: m.agentName }))]
        .filter((m, i, a) => a.findIndex(x => x.id === m.id) === i);
      saveChat(next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const s = await kc<PalState>('pal');
      setState(s);
      // First open of a session: start after what's already on screen, so old support lines aren't repeated.
      if (lastSupportId.current === 0 && loadChat().length) lastSupportId.current = Math.max(0, ...s.messages.map(m => m.id));
      mergeSupport(s);
    } catch (e) { if (!(e instanceof KcError && e.status === 404)) setErr('Kobo Pal is unreachable right now.'); }
  }, [mergeSupport]);
  useEffect(() => { load(); }, [load]);
  // While a case is open, check for the agent's replies every 4 s.
  const caseOpen = !!state?.case && state.case.status !== 'closed';
  useEffect(() => {
    if (!caseOpen) return;
    const t = setInterval(async () => {
      try { const s = await kc<{ case: SupportCase | null; messages: SupportMsg[] }>(`support/case?after=${lastSupportId.current}`); setState(st => (st ? { ...st, case: s.case } : st)); mergeSupport(s); } catch { /* keep trying */ }
    }, 4000);
    return () => clearInterval(t);
  }, [caseOpen, mergeSupport]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [msgs.length, busy, view]);

  const push = (m: ChatMsg) => setMsgs(prev => { const next = [...prev, m]; saveChat(next); return next; });

  // Opened from "Ask Kobo Pal" on a failure: ask about it once Pal's state is in (a case may be open).
  useEffect(() => {
    if (!ask || !state || asked.current) return;
    asked.current = true;
    send(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask, state]);

  async function send(textIn?: string) {
    const text = (textIn ?? draft).trim();
    if (!text || busy) return;
    setDraft(''); setErr('');
    push({ id: `u${Date.now()}`, from: 'user', text });
    setBusy(true);
    try {
      if (caseOpen) {
        const s = await kc<{ case: SupportCase | null; messages: SupportMsg[] }>('support/message', { method: 'POST', body: { message: text, after: lastSupportId.current } });
        setState(st => (st ? { ...st, case: s.case } : st));
        mergeSupport(s);
      } else {
        const r = await kc<ChatRes>('pal/chat', { method: 'POST', body: { message: text } });
        if (r.reply) push({ id: `p${Date.now()}`, from: 'pal', text: r.reply, actions: r.actions, tier: r.tier });
        if (r.caseId || r.routedToCase || r.tier === 'vip' || r.freeLeft != null) await load();
      }
    } catch (e) {
      setErr(e instanceof KcError && e.status === 429 ? 'Slow down a little — try again in a minute.' : e instanceof Error ? e.message : 'Something went wrong');
    } finally { setBusy(false); }
  }

  async function talkToPerson() {
    setBusy(true); setErr('');
    try {
      const r = await kc<{ caseId: number; reply: string; case: SupportCase | null; messages: SupportMsg[] }>('support/open', { method: 'POST', body: {} });
      push({ id: `p${Date.now()}`, from: 'pal', text: r.reply });
      lastSupportId.current = Math.max(lastSupportId.current, ...r.messages.map(m => m.id));
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not reach the team'); }
    finally { setBusy(false); }
  }
  async function solved() {
    setBusy(true);
    try { await kc('support/close', { method: 'POST', body: {} }); await load(); } catch { /* shown on next load */ }
    finally { setBusy(false); }
  }
  async function rate(rating: number) {
    if (!state?.case) return;
    try { await kc('support/rate', { method: 'POST', body: { caseId: state.case.id, rating } }); setState(s => (s && s.case ? { ...s, case: { ...s.case, rating } } : s)); } catch { /* ignore */ }
  }

  const c = state?.case;
  const subtitle = c && c.status === 'active' ? `${c.agentName} · Kobocent support`
    : c && c.status === 'waiting' ? 'Connecting you to a person…'
    : state?.vip ? `Pal VIP · about ${state.answersLeft} answer${state.answersLeft === 1 ? '' : 's'} left`
    : state ? `${state.freeLeft} of ${state.freePerDay} free answers left today` : 'Your money companion';

  return (
    <div className="fixed inset-0 z-[45] flex sm:justify-end" role="dialog" aria-modal="true" aria-label="Kobo Pal">
      <button className="hidden sm:block absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative flex flex-col w-full sm:max-w-md h-[100dvh] bg-cream dark:bg-night sm:shadow-lift animate-fade-up"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 h-16 border-b border-cream-border dark:border-night-border">
          {view === 'tip'
            ? <button onClick={() => setView('chat')} aria-label="Back to chat" className="grid place-items-center h-11 w-11 -ml-2 rounded-xl muted"><span className="rotate-180"><IconChevron /></span></button>
            : <span className="grid place-items-center h-10 w-10 rounded-2xl bg-terracotta text-white"><IconPal size={22} /></span>}
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-[17px] text-ink dark:text-cream-warm leading-tight">{view === 'tip' ? 'Tip Kobo Pal' : 'Kobo Pal'}</p>
            <p className="text-[12.5px] muted truncate">{view === 'tip' ? 'Unlock Pal VIP' : subtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid place-items-center h-11 w-11 rounded-xl muted hover:text-terracotta"><IconClose /></button>
        </div>

        {view === 'tip' && state ? <TipView state={state} onNavigate={go} onDone={async () => { await load(); setView('chat'); }} /> : (
          <>
            {/* VIP strip */}
            {state && !caseOpen && (
              <button onClick={() => setView('tip')} className="shrink-0 mx-4 mt-3 rounded-2xl px-4 py-3 text-left bg-cream-warm dark:bg-night-card border border-cream-border dark:border-night-border">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-ink dark:text-cream-warm">{state.vip ? '⭐ Pal VIP credit' : '⭐ Unlock Pal VIP'}</span>
                  <span className="text-[12.5px] font-semibold text-terracotta">{state.vip ? 'Top up' : 'Tip Pal'}</span>
                </span>
                {state.vip ? (
                  <>
                    <span className="block mt-2 h-2 rounded-full bg-cream-border dark:bg-night-border overflow-hidden"><span className="block h-full rounded-full bg-terracotta transition-all" style={{ width: `${Math.max(4, state.creditPct * 100)}%` }} /></span>
                    <span className="block mt-1.5 text-[12px] muted">${state.credit.toFixed(2)} · about {state.answersLeft} deep answers left</span>
                  </>
                ) : <span className="block mt-1 text-[12.5px] muted leading-snug">Money check-ups, Earn plans, spending insights and market deep-dives from a far more capable Pal.</span>}
              </button>
            )}

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
              {!msgs.length && (
                <div className="pt-2">
                  <div className="rounded-2xl rounded-bl-md bg-white dark:bg-night-card border border-cream-border dark:border-night-border px-4 py-3 text-[15px] leading-relaxed max-w-[88%]">
                    Hi! I'm <b>Kobo Pal</b>. Ask me anything about your money on Kobocent — paying bills, sending, Earn, your last payment. If you need a person, I'll bring one in.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STARTERS.map(s => <button key={s} onClick={() => send(s)} className="rounded-full border border-cream-border dark:border-night-border px-3.5 min-h-[40px] text-[13.5px] text-ink dark:text-cream-warm hover:border-terracotta">{s}</button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => m.from === 'system' ? (
                <p key={m.id} className="text-center text-[12px] muted px-6">{m.text}</p>
              ) : m.from === 'user' ? (
                <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-terracotta text-white px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</div></div>
              ) : (
                <div key={m.id} className="flex items-end gap-2">
                  {m.from === 'agent' ? <Initials name={m.name} /> : <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-terracotta text-white"><IconPal size={16} /></span>}
                  <div className="max-w-[85%]">
                    <p className="text-[11.5px] muted mb-1 ml-1">{m.from === 'agent' ? `${m.name || 'Support'} · Kobocent support` : m.tier === 'vip' ? 'Kobo Pal · VIP' : 'Kobo Pal'}</p>
                    <div className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words border ${m.from === 'agent' ? 'bg-white dark:bg-night-card border-ink/15 dark:border-cream-warm/20' : 'bg-white dark:bg-night-card border-cream-border dark:border-night-border'}`}><Rich text={m.text} /></div>
                    {i === msgs.length - 1 && !!m.actions?.length && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.actions.filter(a => SCREENS[a]).map(a => SCREENS[a].external
                          ? <a key={a} href={SCREENS[a].href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-terracotta-soft text-terracotta px-3.5 min-h-[40px] inline-flex items-center text-[13.5px] font-semibold">{SCREENS[a].label}</a>
                          : <button key={a} onClick={() => go(SCREENS[a].href)} className="rounded-full bg-terracotta-soft text-terracotta px-3.5 min-h-[40px] inline-flex items-center text-[13.5px] font-semibold">{SCREENS[a].label}</button>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 muted text-[13px] ml-10"><span className="inline-flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" /><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" /></span>{caseOpen ? 'Sending…' : 'Pal is thinking…'}</div>}
              {c?.status === 'closed' && !c.rating && (
                <div className="rounded-2xl bg-cream-warm dark:bg-night-card p-4 text-center">
                  <p className="text-[14px] text-ink dark:text-cream-warm">Case closed{c.closedBy ? ` by ${c.closedBy}` : ''}. How did we do?</p>
                  <div className="mt-3 flex justify-center gap-3">
                    <button onClick={() => rate(5)} className="btn-ghost min-h-[44px] px-5">👍 Helpful</button>
                    <button onClick={() => rate(1)} className="btn-ghost min-h-[44px] px-5">👎 Not really</button>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Case banner + composer */}
            <div className="shrink-0 border-t border-cream-border dark:border-night-border bg-cream dark:bg-night" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {caseOpen ? (
                <div className="flex items-center gap-3 px-4 pt-3">
                  {c?.status === 'active' ? <Initials name={c.agentName} /> : <span className="h-2.5 w-2.5 rounded-full bg-[#B68B2A] animate-pulse ml-1" />}
                  <p className="flex-1 text-[13px] muted leading-snug">{c?.status === 'active' ? <>You're chatting with <b className="text-ink dark:text-cream-warm">{c.agentName}</b> from the Kobocent team.</> : 'Waiting for a person from the team — keep typing, they will see everything.'}</p>
                  <button onClick={solved} disabled={busy} className="text-[13px] font-semibold text-terracotta min-h-[44px] px-1">Solved</button>
                </div>
              ) : state && (
                <div className="flex justify-end px-4 pt-2">
                  <button onClick={talkToPerson} disabled={busy} className="text-[13px] font-semibold text-terracotta min-h-[40px]">Talk to a person</button>
                </div>
              )}
              {err && <p className="px-4 pt-1 text-[13px] text-[#B84A40]">{err}</p>}
              <div className="flex items-end gap-2 px-4 py-3">
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} maxLength={2000}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } }}
                  placeholder={caseOpen ? `Message ${c?.agentName || 'the support team'}…` : 'Ask Kobo Pal…'} aria-label="Message"
                  className="flex-1 resize-none max-h-36 rounded-2xl border border-cream-border dark:border-night-border bg-white dark:bg-night-card px-4 py-3 text-[16px] leading-snug text-ink dark:text-cream-warm outline-none focus:border-terracotta" />
                <button onClick={() => send()} disabled={busy || !draft.trim()} aria-label="Send" className="grid place-items-center h-12 w-12 shrink-0 rounded-2xl bg-terracotta text-white disabled:opacity-40"><IconSend size={20} /></button>
              </div>
              <p className="px-4 pb-2 -mt-1 text-[11px] muted text-center">Pal never asks for your recovery phrase or PIN.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TipView({ state, onDone, onNavigate }: { state: PalState; onDone: () => void; onNavigate: (href: string) => void }) {
  const [pick, setPick] = useState<Tier | null>(null);
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState('');
  const keyRef = useRef<string>(newKey());
  // Pay from any balance (2026-10-08) — the same picker as Withdraw, Send and Bills; cheapest balance that covers the tip.
  const pf = usePayFrom(pick?.usd ?? 0);

  async function start() {
    if (!pick) return;
    setStarting(true); setErr('');
    try {
      let j = await kc<Job>('pal/tip', { method: 'POST', body: { amount: pick.usd, idempotencyKey: keyRef.current, ...pf.fromBody } });
      setJob(j);
      for (let i = 0; i < 90 && j.status !== 'done'; i++) {
        await new Promise(r => setTimeout(r, 1500));
        try { j = await kc<Job>(`pal/jobs/${j.id}`); setJob(j); } catch { /* keep polling */ }
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'The tip did not go through'); }
    finally { setStarting(false); }
  }

  const res = job?.status === 'done' ? job.result : null;
  if (res?.ok) return (
    <div className="flex-1 overflow-y-auto px-5 py-8 text-center">
      <div className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-[#58834C]/15 text-[40px]">⭐</div>
      <h2 className="font-display text-[26px] font-bold mt-5 text-ink dark:text-cream-warm">Pal VIP unlocked</h2>
      <p className="muted text-[15px] mt-2 leading-relaxed">Thank you for the ${res.amount} tip. ${res.creditAdded?.toFixed(2)} went into your VIP credit — you now have <b className="text-ink dark:text-cream-warm">${res.credit?.toFixed(2)}</b>, about {res.answersLeft} deep answers.</p>
      <p className="muted text-[14px] mt-4">Try: “Give me a money check-up” or “Build me a 30-day growth plan”.</p>
      {res.paidFrom && <p className="muted text-[13px] mt-3">Paid from {res.paidFrom}</p>}
      {(res.explorerUrl || res.signature) && <a href={res.explorerUrl || `https://solscan.io/tx/${res.signature}`} target="_blank" rel="noopener noreferrer" className="block mt-2 text-[13px] text-terracotta font-semibold min-h-[44px] leading-[44px]">View the on-chain transfer</a>}
      <button onClick={onDone} className="btn-primary w-full mt-6 min-h-[52px]">Ask Pal VIP</button>
    </div>
  );
  if (res && !res.ok) return (
    <div className="flex-1 overflow-y-auto px-5 py-8 text-center">
      <h2 className="font-display text-[22px] font-bold text-ink dark:text-cream-warm">{res.code === 'OUTCOME_UNKNOWN' ? 'Confirming your tip' : 'The tip did not go through'}</h2>
      <p className="muted text-[15px] mt-2 leading-relaxed">{res.error}</p>
      {res.code === 'INSUFFICIENT' && <>
        <button onClick={() => { setJob(null); keyRef.current = newKey(); pf.setPicking(true); }} className="btn-primary w-full mt-6 min-h-[52px]">Pay from another balance</button>
        <button onClick={() => onNavigate('/app/add-money')} className="btn-ghost w-full mt-3 min-h-[48px]">Add money</button>
      </>}
      <button onClick={onDone} className="btn-ghost w-full mt-3 min-h-[48px]">Back to chat</button>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <p className="text-[14.5px] leading-relaxed text-ink dark:text-cream-warm">
        Pal VIP runs on a far more capable AI. It digs into your real balances, spending and Earn options, explains Smart Picks momentum signals with the risks, and builds you a money plan.
      </p>
      <p className="text-[13px] muted mt-2">Half of every tip becomes your VIP credit; the other half keeps Pal running for everyone. Pay from any balance, on any chain.</p>
      {state.vip && <p className="text-[13px] mt-2 text-ink dark:text-cream-warm">You have ${state.credit.toFixed(2)} credit now — tips add to it.</p>}
      <div className="mt-4 space-y-2.5">
        {state.tips.map(t => (
          <button key={t.usd} onClick={() => setPick(t)} aria-pressed={pick?.usd === t.usd}
            className={`w-full text-left rounded-2xl border px-4 py-3.5 min-h-[64px] transition-colors ${pick?.usd === t.usd ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border bg-white dark:bg-night-card'}`}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[19px] font-bold text-ink dark:text-cream-warm">${t.usd} <span className="text-[14px] font-semibold">· {t.title}</span></span>
              <span className="text-[12px] muted shrink-0">≈{t.answers} answers</span>
            </span>
            <span className="block text-[13px] muted mt-1 leading-snug">{t.perks}</span>
          </button>
        ))}
      </div>
      {pick && <div className="mt-4"><PayFromPicker pf={pf} /></div>}
      <p className="text-[12px] muted mt-3">Market signals are never guarantees. {pf.isSolana ? 'Kobocent covers the network fee.' : 'Coins are priced live — the exact amount is set when you confirm.'}</p>
      {err && <p className="text-[13px] text-[#B84A40] mt-3">{err}</p>}
      <div className="mt-4">
        {pick
          ? (job ? <button disabled className="btn-primary w-full min-h-[56px] opacity-70">Sending your tip…</button>
            : <HoldToConfirm label={`Hold to tip $${pick.usd}`} busy={starting} onConfirm={start} />)
          : <button disabled className="btn-primary w-full min-h-[56px] opacity-40">Choose an amount</button>}
      </div>
    </div>
  );
}
