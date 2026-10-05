'use client';
import { useCallback, useEffect, useState } from 'react';
import { kc, KcError, BOT, type Account } from '@/lib/kc';
import { Sheet } from './ui';
import { PinPad } from './PinPad';
import { GoogleButton, googleEnabled } from './GoogleButton';
import { IconShield, IconTelegram } from './Icons';

/**
 * Settings → App lock & sign-in (sign-in v2, founder 2026-10-05).
 * Defaults: PIN on, auto-lock after 15 min, PIN before payments. People who like to move fast can
 * lengthen the timer or turn the PIN off — anything that loosens protection asks for the PIN first.
 */
interface Security { hasPin: boolean; enabled: boolean; timeoutMin: number; requireForPayments: boolean; methods?: { telegram: boolean; google: boolean; email: string | null } }
const LABEL: Record<number, string> = { 5: '5 minutes', 15: '15 minutes (recommended)', 30: '30 minutes', 60: '1 hour', 240: '4 hours', 0: 'Never' };
const changed = () => window.dispatchEvent(new Event('kc-security-changed'));

export function SecuritySettings({ account, onAccount }: { account: Account | null; onAccount: (a: Account) => void }) {
  const [sec, setSec] = useState<Security | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  // A pending change that needs the PIN first
  const [pending, setPending] = useState<null | { label: string; body: Record<string, unknown> }>(null);
  const [changePin, setChangePin] = useState(false);
  const [moveCode, setMoveCode] = useState<{ code: string } | null>(null);

  const load = useCallback(() => kc<Security>('security').then(setSec).catch(e => { if (e instanceof KcError && e.status === 404) setUnsupported(true); }), []);
  useEffect(() => { load(); }, [load]);

  async function apply(body: Record<string, unknown>, label: string) {
    setErr(''); setNote('');
    try { setSec(await kc<Security>('security/settings', { method: 'POST', body })); setNote('Saved'); changed(); }
    catch (e) {
      // Loosening protection needs the PIN — ask, then retry with it.
      if (e instanceof KcError && (e.status === 401 || e.status === 422) && !('pin' in body) && /pin/i.test(e.message)) setPending({ label, body });
      else setErr(e instanceof Error ? e.message : 'Could not save');
    }
  }

  if (unsupported) return null;
  return (
    <section>
      <div className="eyebrow mb-2">App lock & sign-in</div>
      <div className="surface rounded-3xl divide-y divide-cream-border dark:divide-night-border">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-terracotta shrink-0"><IconShield size={20} /></span>
            <div className="flex-1">
              <div className="font-medium text-ink dark:text-cream-warm">App PIN</div>
              <div className="text-[13.5px] muted">{!sec ? 'Loading…' : !sec.hasPin ? 'Not set — payments will ask you to create one.' : sec.enabled ? 'On' : 'Off'}</div>
            </div>
            {sec?.hasPin && <button onClick={() => setChangePin(true)} className="text-[14px] font-semibold text-terracotta min-h-[44px] px-2">Change</button>}
          </div>
          {sec?.hasPin && (
            <>
              <label className="flex items-center justify-between gap-3 min-h-[44px]">
                <span className="text-[14.5px]">Use the PIN</span>
                <input type="checkbox" checked={sec.enabled} onChange={e => apply({ enabled: e.target.checked }, e.target.checked ? 'Turn the PIN on' : 'Turn the PIN off')} className="h-6 w-6 accent-[#C1502E]" />
              </label>
              {sec.enabled && (
                <>
                  <label className="flex items-center justify-between gap-3 min-h-[44px]">
                    <span className="text-[14.5px]">Lock the app after</span>
                    <select value={sec.timeoutMin} onChange={e => apply({ timeoutMin: Number(e.target.value) }, `Lock after ${LABEL[Number(e.target.value)]}`)}
                      className="rounded-xl border border-cream-border dark:border-night-border bg-transparent px-3 min-h-[44px] text-[14px]">
                      {[5, 15, 30, 60, 240, 0].map(m => <option key={m} value={m}>{LABEL[m]}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-3 min-h-[44px]">
                    <span className="text-[14.5px]">Ask for the PIN before payments</span>
                    <input type="checkbox" checked={sec.requireForPayments} onChange={e => apply({ requireForPayments: e.target.checked }, e.target.checked ? 'Ask before payments' : 'Stop asking before payments')} className="h-6 w-6 accent-[#C1502E]" />
                  </label>
                </>
              )}
              <p className="text-[12.5px] muted">Forgot it? Sign out and sign in again — you can then set a new PIN.</p>
            </>
          )}
          {note && <p className="text-[13px] text-[#58834C]">{note}</p>}
          {err && <p className="text-[13px] text-[#B84A40]">{err}</p>}
        </div>

        {/* Sign-in methods */}
        <div className="p-5 space-y-3">
          <div className="font-medium text-ink dark:text-cream-warm">Ways to sign in</div>
          <p className="text-[13px] muted">Keep two, so losing one never locks you out of your money.</p>
          <div className="flex items-center justify-between gap-3 min-h-[44px]">
            <span className="flex items-center gap-2 text-[14.5px]"><IconTelegram />Telegram</span>
            <span className={`text-[12.5px] font-semibold ${account?.telegramLinked ? 'text-[#58834C]' : 'muted'}`}>{account?.telegramLinked ? 'Connected' : 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between gap-3 min-h-[44px]">
            <span className="flex items-center gap-2 text-[14.5px]"><span aria-hidden className="font-bold">G</span>Google{sec?.methods?.email ? <span className="muted text-[12.5px] truncate max-w-[160px]"> · {sec.methods.email}</span> : null}</span>
            <span className={`text-[12.5px] font-semibold ${account?.googleLinked ? 'text-[#58834C]' : 'muted'}`}>{account?.googleLinked ? 'Connected' : 'Not connected'}</span>
          </div>
          {!account?.googleLinked && googleEnabled() && (
            <GoogleButton text="continue_with" onCredential={async (credential) => {
              setErr('');
              try { const r = await kc<{ account: Account }>('auth/google/link', { method: 'POST', body: { credential } }); onAccount(r.account); load(); setNote('Google added as a backup'); }
              catch (e) { setErr(e instanceof Error ? e.message : 'Could not add Google'); }
            }} />
          )}
          {account?.telegramLinked && (
            <div className="pt-1">
              {moveCode ? (
                <div className="rounded-2xl bg-cream dark:bg-night p-4 text-center">
                  <div className="font-mono text-[26px] tracking-[0.2em] font-semibold">{moveCode.code}</div>
                  <p className="text-[13px] muted mt-2">From your <b>new</b> Telegram account, send <span className="font-mono">/link {moveCode.code}</span> to @{BOT} within 10 minutes. Your wallet and history move to it.</p>
                </div>
              ) : (
                <button onClick={async () => { setErr(''); try { setMoveCode(await kc<{ code: string }>('link/telegram-code', { method: 'POST', body: { purpose: 'move' } })); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create a code'); } }}
                  className="text-[13.5px] font-semibold text-terracotta min-h-[44px]">Lost your Telegram? Move to a new Telegram account</button>
              )}
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Enter your PIN">
        {pending && <ConfirmWithPin label={pending.label} onPin={async (pin) => { const body = { ...pending.body, pin }; setPending(null); await apply(body, pending.label); }} />}
      </Sheet>
      <Sheet open={changePin} onClose={() => setChangePin(false)} title="Change your PIN">
        {changePin && <ChangePin onDone={() => { setChangePin(false); setNote('PIN changed'); load(); changed(); }} />}
      </Sheet>
    </section>
  );
}

function ConfirmWithPin({ label, onPin }: { label: string; onPin: (pin: string) => void }) {
  return (<><p className="muted text-[14px] text-center">{label} — confirm with your PIN.</p><PinPad onComplete={onPin} /></>);
}

function ChangePin({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [first, setFirst] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  async function step(pin: string) {
    setErr('');
    if (!current) { setCurrent(pin); setReset(x => x + 1); return; }
    if (!first) { setFirst(pin); setReset(x => x + 1); return; }
    if (pin !== first) { setErr('Those didn’t match — enter the new PIN again'); setFirst(null); setReset(x => x + 1); return; }
    setBusy(true);
    try { await kc('security/pin', { method: 'POST', body: { pin, currentPin: current } }); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not change your PIN'); setCurrent(null); setFirst(null); setReset(x => x + 1); }
    finally { setBusy(false); }
  }
  return (
    <>
      <p className="muted text-[14px] text-center">{!current ? 'Enter your current PIN.' : !first ? 'Now choose a new 6-digit PIN.' : 'Enter the new PIN once more.'}</p>
      <PinPad onComplete={step} busy={busy} error={err} resetKey={reset} />
    </>
  );
}
