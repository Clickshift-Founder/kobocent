'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kc } from '@/lib/kc';
import { Sheet } from './ui';
import { ErrorNote } from './ErrorNote';
import { signOut } from './AppShell';

/**
 * Settings → Delete account (2026-10-12) — required by the App Store (5.1.1(v)) and Google Play. Backend GET/POST
 * /account/delete (src/services/accountDeletion.js): blocked while the account holds more than $1; asks for the PIN; deletes
 * sign-in links, profile, PIN, saved banks, Pal memory and the stored wallet keys; keeps transaction / KYC records as the law
 * requires. Public explanation: /delete-account.
 */
interface Plan { ok: true; canDelete: boolean; balanceUsd: number | null; blocker: string | null; unpricedTokens: string[]; deletes: string[]; keeps: string }

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function start() {
    setOpen(true); setPlan(null); setErr(''); setText('');
    try { setPlan(await kc<Plan>('account/delete')); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not check your account'); }
  }
  async function go() {
    setBusy(true); setErr('');
    try { await kc('account/delete', { method: 'POST', body: { confirm: text } }); await signOut(router); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete your account'); }
    finally { setBusy(false); }
  }
  return (
    <section id="delete" className="scroll-mt-20">
      <div className="eyebrow mb-2">Account</div>
      <button onClick={start} className="w-full surface rounded-3xl p-5 text-left min-h-[64px]">
        <span className="block font-medium text-[#B84A40]">Delete account</span>
        <span className="block text-[13.5px] muted">Permanently delete your Kobocent account and its data.</span>
      </button>
      <Sheet open={open} onClose={() => { if (!busy) setOpen(false); }} title="Delete your account">
        {!plan ? (err ? <ErrorNote msg={err} /> : <div className="h-28 rounded-2xl bg-cream-warm dark:bg-night animate-pulse" />) : (
          <div className="space-y-4 text-[14px]">
            {plan.blocker ? (
              <div className="rounded-2xl p-4" style={{ background: '#B68B2A1A' }}>
                <p className="text-ink dark:text-cream-warm">{plan.blocker}</p>
                <div className="mt-3 flex flex-wrap gap-2 [&_a]:rounded-xl [&_a]:border [&_a]:border-cream-border dark:[&_a]:border-night-border [&_a]:px-3 [&_a]:min-h-[44px] [&_a]:inline-flex [&_a]:items-center [&_a]:font-semibold">
                  <Link href="/app/withdraw">Withdraw</Link><Link href="/app/send-wallet">Send to wallet</Link><Link href="/app/settings">Recovery phrase (Settings)</Link>
                </div>
              </div>
            ) : (
              <>
                <div><div className="font-semibold text-ink dark:text-cream-warm mb-1">This deletes</div><ul className="list-disc pl-5 muted space-y-1">{plan.deletes.map(d => <li key={d}>{d}</li>)}</ul></div>
                <p className="muted">{plan.keeps}</p>
                {plan.unpricedTokens.length > 0 && <p style={{ color: '#B84A40' }}>Tokens without a price ({plan.unpricedTokens.join(', ')}) will be lost unless you sell or send them first.</p>}
                <p className="text-ink dark:text-cream-warm font-semibold">This can’t be undone. Type DELETE to confirm.</p>
                <input value={text} onChange={e => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="DELETE"
                  className="w-full surface rounded-2xl px-4 min-h-[52px] text-[16px] font-mono outline-none focus:border-[#B84A40]" />
                <ErrorNote msg={err} />
                <button onClick={go} disabled={busy || text.trim().toUpperCase() !== 'DELETE'} className="w-full rounded-2xl bg-[#B84A40] text-white font-semibold min-h-[52px] disabled:opacity-40">{busy ? 'Deleting…' : 'Delete my account'}</button>
              </>
            )}
            <p className="text-[12.5px] muted">More: <a href="/delete-account" className="underline">what is deleted and what the law makes us keep</a>.</p>
          </div>
        )}
      </Sheet>
    </section>
  );
}
