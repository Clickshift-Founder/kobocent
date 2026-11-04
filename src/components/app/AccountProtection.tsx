'use client';
import { useCallback, useEffect, useState } from 'react';
import { kc, KcError } from '@/lib/kc';
import { Sheet } from './ui';
import { ErrorNote } from './ErrorNote';
import { IconCheck, IconShield } from './Icons';

/**
 * Account protection (founder, 2026-11-03): security questions, freeze, unfreeze.
 *  - Freeze is one tap and asks for nothing: the owner may be in a hurry on a borrowed device.
 *  - Unfreeze needs a real sign-in in the last 10 minutes and all three answers. No answers set → a person on our team.
 *  - Anything in the app opens these sheets with protect('freeze' | 'unfreeze' | 'questions').
 * Backend: src/services/accountSecurity.js, routes /security/*.
 */
export interface Question { id: string; text: string }
export interface Protection {
  frozen: boolean; frozenAt: number | null; frozenVia: string | null;
  hasQuestions: boolean; questions: Question[] | null;
  answersLockedUntil: number | null; coolingUntil: number | null;
}
export type ProtectAction = 'freeze' | 'unfreeze' | 'questions';

export const protect = (action: ProtectAction) => window.dispatchEvent(new CustomEvent('kc-protect', { detail: action }));
const changed = () => window.dispatchEvent(new Event('kc-security-changed'));
const talkToPerson = () => window.dispatchEvent(new Event('kc-open-pal'));
const when = (ms: number) => new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const field = 'w-full rounded-2xl border border-cream-border dark:border-night-border bg-transparent px-4 min-h-[48px] text-[16px] text-ink dark:text-cream-warm';
const quiet = { autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const;

/** The three questions, typed in. Never says which answer was wrong. */
export function AnswerForm({ questions, cta, busy, error, onSubmit }: {
  questions: Question[]; cta: string; busy: boolean; error: string; onSubmit: (answers: Record<string, string>) => void;
}) {
  const [a, setA] = useState<Record<string, string>>({});
  const full = questions.every(q => (a[q.id] || '').trim().length >= 2);
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (full && !busy) onSubmit(a); }}>
      {questions.map(q => (
        <label key={q.id} className="block">
          <span className="block text-[14px] font-medium text-ink dark:text-cream-warm mb-1.5">{q.text}</span>
          <input {...quiet} className={field} value={a[q.id] || ''} onChange={e => { const v = e.target.value; setA(p => ({ ...p, [q.id]: v })); }} />
        </label>
      ))}
      <p className="text-[12.5px] muted">Capitals and spaces don’t matter.</p>
      <ErrorNote msg={error} className="text-[13.5px] text-[#B84A40]" />
      <button type="submit" disabled={!full || busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Checking…' : cta}</button>
    </form>
  );
}

/** Lock screen and "Forgot PIN": the answers open the PIN again and allow a new one. */
export function PinAnswers({ intro, onUnlocked, onCancel }: { intro: string; onUnlocked: (resetToken: string) => void; onCancel?: () => void }) {
  const [p, setP] = useState<Protection | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  useEffect(() => {
    kc<Protection>('security/questions').then(r => { setP(r); setLockedUntil(r.answersLockedUntil); }).catch(e => setErr(e instanceof Error ? e.message : 'Could not load your questions'));
  }, []);
  async function submit(answers: Record<string, string>) {
    setBusy(true); setErr('');
    try { onUnlocked((await kc<{ resetToken: string }>('security/pin/unlock', { method: 'POST', body: { answers } })).resetToken); }
    catch (e) {
      if (e instanceof KcError && e.data.code === 'ANSWERS_LOCKED') { setLockedUntil(Number(e.data.lockedUntil) || null); changed(); }
      setErr(e instanceof Error ? e.message : 'Could not check your answers');
    } finally { setBusy(false); }
  }
  const back = onCancel ? <button onClick={onCancel} className="block w-full text-center text-[14px] muted min-h-[44px]">Back</button> : null;
  if (lockedUntil) return (
    <div className="space-y-3 text-center">
      <p className="text-[14.5px] text-ink dark:text-cream-warm">Your security questions are locked until {when(lockedUntil)}, and your account is frozen to keep your money safe.</p>
      <a href="/support" className="btn-primary w-full">Contact support</a>
      {back}
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="muted text-[14px] text-center">{intro}</p>
      {p?.questions ? <AnswerForm questions={p.questions} cta="Continue" busy={busy} error={err} onSubmit={submit} /> : <ErrorNote msg={err} className="text-[13.5px] text-[#B84A40]" />}
      {back}
    </div>
  );
}

/** Pick three questions, one step each, typing each answer twice. Changing them asks the current answers first. */
function QuestionsWizard({ onDone }: { onDone: () => void }) {
  const [pool, setPool] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question[] | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string> | null>(null);
  const [items, setItems] = useState<Array<{ id: string; answer: string }>>([]);
  const [qid, setQid] = useState('');
  const [ans, setAns] = useState('');
  const [again, setAgain] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    kc<Protection & { pool: Question[] }>('security/questions')
      .then(r => { setPool(r.pool); setCurrent(r.hasQuestions ? r.questions : null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load the questions'));
  }, []);
  const step = items.length;
  const left = pool.filter(q => !items.some(i => i.id === q.id));

  async function save(all: Array<{ id: string; answer: string }>) {
    setBusy(true); setErr('');
    try { await kc('security/questions', { method: 'POST', body: { items: all, currentAnswers } }); setSaved(true); changed(); }
    catch (e) {
      const code = e instanceof KcError ? e.data.code : null;
      setErr(e instanceof Error ? e.message : 'Could not save your questions');
      if (code === 'WRONG_ANSWERS' || code === 'CURRENT_ANSWERS') { setCurrentAnswers(null); setItems([]); }
      else setItems(all.slice(0, 2));
    } finally { setBusy(false); }
  }
  function next() {
    setErr('');
    const a = ans.trim();
    if (!qid) { setErr('Choose a question'); return; }
    if (a.length < 2) { setErr('Your answer is too short'); return; }
    if (a.toLowerCase() !== again.trim().toLowerCase()) { setErr('The two answers don’t match'); return; }
    if (items.some(i => i.answer.trim().toLowerCase() === a.toLowerCase())) { setErr('Use a different answer for each question'); return; }
    const all = [...items, { id: qid, answer: a }];
    setItems(all); setQid(''); setAns(''); setAgain('');
    if (all.length === 3) void save(all);
  }

  if (saved) return (
    <div className="flex flex-col items-center text-center py-4" role="status">
      <div className="grid place-items-center h-16 w-16 rounded-full bg-[#58834C]/15 text-[#58834C]"><IconCheck size={30} /></div>
      <h3 className="font-display text-[20px] font-bold mt-3 text-ink dark:text-cream-warm">Questions saved</h3>
      <p className="muted text-[14px] mt-1 max-w-xs">Your answers are scrambled before we store them, so nobody at Kobocent can read them. Remember them: they unfreeze your account and reset your PIN.</p>
      <button onClick={onDone} className="btn-primary w-full mt-5">Done</button>
    </div>
  );
  if (current && !currentAnswers) return (
    <div className="space-y-3">
      <p className="muted text-[14px]">Answer your current questions first.</p>
      <AnswerForm questions={current} cta="Continue" busy={false} error={err} onSubmit={a => { setErr(''); setCurrentAnswers(a); }} />
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5" aria-label={`Question ${Math.min(step + 1, 3)} of 3`}>
        {[0, 1, 2].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-terracotta' : 'bg-cream-border dark:bg-night-border'}`} />)}
      </div>
      <p className="muted text-[14px]">Pick answers only you know, that never change, and that aren’t on your social media.</p>
      {step < 3 ? (
        <>
          <label className="block">
            <span className="block text-[14px] font-medium text-ink dark:text-cream-warm mb-1.5">Question {step + 1} of 3</span>
            <select className={field} value={qid} onChange={e => setQid(e.target.value)}>
              <option value="">Choose a question</option>
              {left.map(q => <option key={q.id} value={q.id}>{q.text}</option>)}
            </select>
          </label>
          <label className="block"><span className="block text-[14px] font-medium text-ink dark:text-cream-warm mb-1.5">Your answer</span>
            <input {...quiet} className={field} value={ans} onChange={e => setAns(e.target.value)} /></label>
          <label className="block"><span className="block text-[14px] font-medium text-ink dark:text-cream-warm mb-1.5">Type it again</span>
            <input {...quiet} className={field} value={again} onChange={e => setAgain(e.target.value)} /></label>
          <ErrorNote msg={err} className="text-[13.5px] text-[#B84A40]" />
          <button type="button" onClick={next} className="btn-primary w-full">{step === 2 ? 'Save my questions' : 'Next question'}</button>
        </>
      ) : <p className="text-center muted text-[14px] py-6">{busy ? 'Saving…' : ''}</p>}
    </div>
  );
}

function FreezeBody({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  async function freeze() {
    setBusy(true); setErr('');
    try { await kc('security/freeze', { method: 'POST', body: {} }); setDone(true); changed(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not freeze your account. Contact support right away.'); }
    finally { setBusy(false); }
  }
  if (done) return (
    <div className="flex flex-col items-center text-center py-4" role="status">
      <div className="grid place-items-center h-16 w-16 rounded-full bg-terracotta-soft text-[30px]" aria-hidden>🧊</div>
      <h3 className="font-display text-[20px] font-bold mt-3 text-ink dark:text-cream-warm">Your account is frozen</h3>
      <p className="muted text-[14px] mt-1 max-w-xs">No money can leave it, from the app or from Telegram.</p>
      <button onClick={onClose} className="btn-primary w-full mt-5">Done</button>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-ink dark:text-cream-warm">Lost your phone, or think someone got in? Freeze now and sort out the rest after.</p>
      <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] leading-relaxed">
        <div className="eyebrow mb-1.5">Stops at once</div>
        <p className="muted">Withdrawals, sends, bills, bridges, swaps, buying tokens and showing your recovery phrase, on every device.</p>
        <div className="eyebrow mt-3 mb-1.5">Keeps working</div>
        <p className="muted">Money coming in, and any stop loss, take profit or trailing exit you already set.</p>
      </div>
      <ErrorNote msg={err} className="text-[13.5px] text-[#B84A40]" />
      <button onClick={freeze} disabled={busy} className="w-full min-h-[52px] rounded-2xl bg-[#B84A40] text-white font-semibold text-[16px] disabled:opacity-50">{busy ? 'Freezing…' : 'Freeze my account'}</button>
      <button onClick={onClose} className="block w-full text-center text-[14px] muted min-h-[44px]">Cancel</button>
    </div>
  );
}

function UnfreezeBody({ onClose, onSignInAgain }: { onClose: () => void; onSignInAgain: () => void }) {
  const [p, setP] = useState<(Protection & { freshSignIn: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [needSignIn, setNeedSignIn] = useState(false);
  const [coolingUntil, setCoolingUntil] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const load = useCallback(async () => {
    try { const s = await kc<{ protection: Protection; freshSignIn: boolean }>('security'); setP({ ...s.protection, freshSignIn: s.freshSignIn }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not load your account'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(answers: Record<string, string>) {
    setBusy(true); setErr('');
    try { const r = await kc<{ coolingUntil?: number }>('security/unfreeze', { method: 'POST', body: { answers } }); setCoolingUntil(r.coolingUntil || null); setDone(true); changed(); }
    catch (e) {
      const code = e instanceof KcError ? e.data.code : null;
      if (code === 'FRESH_SIGNIN') setNeedSignIn(true);
      else if (code === 'ANSWERS_LOCKED') void load();
      setErr(e instanceof Error ? e.message : 'Could not unfreeze your account');
    } finally { setBusy(false); }
  }
  const person = <button onClick={() => { onClose(); talkToPerson(); }} className="btn-primary w-full">Talk to a person</button>;
  if (done) return (
    <div className="flex flex-col items-center text-center py-4" role="status">
      <div className="grid place-items-center h-16 w-16 rounded-full bg-[#58834C]/15 text-[#58834C]"><IconCheck size={30} /></div>
      <h3 className="font-display text-[20px] font-bold mt-3 text-ink dark:text-cream-warm">Your account is open again</h3>
      <p className="muted text-[14px] mt-1 max-w-xs">{coolingUntil ? `Until ${when(coolingUntil)}, money can only go to banks and wallets you’ve paid before. That keeps you safe if it wasn’t you.` : 'Your money can move again.'}</p>
      <button onClick={onClose} className="btn-primary w-full mt-5">Done</button>
    </div>
  );
  if (!p) return <ErrorNote msg={err} className="text-[13.5px] text-[#B84A40]" />;
  if (!p.hasQuestions) return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-ink dark:text-cream-warm">This account has no security questions, so a person on our team will check it’s you and unfreeze it.</p>
      {person}
    </div>
  );
  if (p.answersLockedUntil) return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-ink dark:text-cream-warm">Too many wrong answers. You can try again after {when(p.answersLockedUntil)}, or a person on our team can check it’s you.</p>
      {person}
    </div>
  );
  if (needSignIn || !p.freshSignIn) return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-ink dark:text-cream-warm">First, sign in again. It proves you’re the owner and not someone holding your phone. Then come back here and answer your questions.</p>
      <button onClick={onSignInAgain} className="btn-primary w-full">Sign in again</button>
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-[14.5px] text-ink dark:text-cream-warm">Answer your three security questions to open your account.</p>
      {p.questions && <AnswerForm questions={p.questions} cta="Unfreeze my account" busy={busy} error={err} onSubmit={submit} />}
      <button onClick={() => { onClose(); talkToPerson(); }} className="block w-full text-center text-[14px] muted min-h-[44px]">Forgot your answers? Talk to a person</button>
    </div>
  );
}

/** The three sheets, mounted once. They sit above the lock screen: someone locked out can still freeze. */
export function ProtectionSheets({ onSignInAgain, onOpenChange }: { onSignInAgain: () => void; onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState<ProtectAction | null>(null);
  useEffect(() => {
    const on = (e: Event) => setOpen((e as CustomEvent<ProtectAction>).detail);
    window.addEventListener('kc-protect', on);
    return () => window.removeEventListener('kc-protect', on);
  }, []);
  useEffect(() => { onOpenChange(!!open); }, [open, onOpenChange]);
  const close = () => setOpen(null);
  const title = open === 'freeze' ? 'Freeze your account' : open === 'unfreeze' ? 'Unfreeze your account' : 'Security questions';
  return (
    <Sheet open={!!open} onClose={close} title={title} top>
      {open === 'freeze' && <FreezeBody onClose={close} />}
      {open === 'unfreeze' && <UnfreezeBody onClose={close} onSignInAgain={onSignInAgain} />}
      {open === 'questions' && <QuestionsWizard onDone={close} />}
    </Sheet>
  );
}

/** Stays on screen while the account is frozen; a quieter line during the 24 hours after. */
export function ProtectionBanner({ p }: { p: Protection | null | undefined }) {
  if (p?.frozen) return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#B84A40] text-white px-4 py-3" role="status">
      <span aria-hidden className="text-[20px]">🧊</span>
      <span className="flex-1 text-[14px] leading-snug"><b>Your account is frozen.</b> No money can leave it.</span>
      <button onClick={() => protect('unfreeze')} className="shrink-0 rounded-xl bg-white/15 px-3 min-h-[44px] text-[14px] font-semibold">Unfreeze</button>
    </div>
  );
  if (p?.coolingUntil) return (
    <div className="mb-4 rounded-2xl bg-cream-warm dark:bg-night px-4 py-3 text-[13.5px] muted" role="status">
      Until {when(p.coolingUntil)}, money can only go to banks and wallets you’ve paid before.
    </div>
  );
  return null;
}

/** Settings: how protected this account is, and every control in one place. */
export function ProtectionCard({ hasPin, twoSignIns, p }: { hasPin: boolean; twoSignIns: boolean; p: Protection | null }) {
  const checks = [
    { label: 'App PIN', done: hasPin },
    { label: 'Security questions', done: !!p?.hasQuestions },
    { label: 'Two ways to sign in', done: twoSignIns },
  ];
  const score = checks.filter(c => c.done).length;
  return (
    <section id="security" className="scroll-mt-20">
      <div className="eyebrow mb-2">Account protection</div>
      <div className="surface rounded-3xl divide-y divide-cream-border dark:divide-night-border">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-terracotta shrink-0"><IconShield size={20} /></span>
            <div className="flex-1 font-medium text-ink dark:text-cream-warm">{p?.frozen ? 'Frozen: no money can leave' : score === 3 ? 'Fully protected' : `${score} of 3 protections on`}</div>
          </div>
          <div className="flex gap-1.5 mt-3" aria-hidden>{checks.map((c, i) => <span key={c.label} className={`h-1.5 flex-1 rounded-full ${i < score ? 'bg-[#58834C]' : 'bg-cream-border dark:bg-night-border'}`} />)}</div>
          <ul className="mt-3 space-y-1.5">
            {checks.map(c => <li key={c.label} className="flex items-center gap-2 text-[13.5px]"><span className={c.done ? 'text-[#58834C]' : 'muted'}>{c.done ? '✓' : '○'}</span><span className={c.done ? 'text-ink dark:text-cream-warm' : 'muted'}>{c.label}</span></li>)}
          </ul>
        </div>
        <button onClick={() => protect('questions')} disabled={!!p?.frozen} className="w-full flex items-center gap-4 p-5 text-left min-h-[64px] disabled:opacity-50">
          <span className="flex-1"><span className="block font-medium text-ink dark:text-cream-warm">Security questions</span><span className="block text-[13.5px] muted">{p?.hasQuestions ? 'Set. They unfreeze your account and reset your PIN.' : 'Not set. Without them, only our team can unfreeze you.'}</span></span>
          <span className="text-[14px] font-semibold text-terracotta">{p?.hasQuestions ? 'Change' : 'Set up'}</span>
        </button>
        {p?.frozen
          ? <button onClick={() => protect('unfreeze')} className="w-full flex items-center gap-4 p-5 text-left min-h-[64px]"><span className="flex-1 font-medium text-ink dark:text-cream-warm">Unfreeze my account</span><span className="text-[14px] font-semibold text-terracotta">Unfreeze</span></button>
          : <button onClick={() => protect('freeze')} className="w-full flex items-center gap-4 p-5 text-left min-h-[64px]">
              <span className="flex-1"><span className="block font-medium text-[#B84A40]">Freeze my account</span><span className="block text-[13.5px] muted">Lost your phone? One tap stops all money leaving, everywhere.</span></span>
              <span aria-hidden className="text-[20px]">🧊</span>
            </button>}
      </div>
    </section>
  );
}
