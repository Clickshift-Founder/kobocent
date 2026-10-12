'use client';
import { useEffect, useState } from 'react';
import { kc, KcError, BOT, type Account } from '@/lib/kc';
import { isIOSApp } from '@/lib/platform';
import { IconCheck, IconGift, IconTelegram, IconShield } from './Icons';

/**
 * "Complete your registration — connect Telegram" (founder, 2026-10-12). Shown after Google / Apple sign-up while the account
 * has no Telegram. One tap: a fresh link code opens the bot at t.me/<bot>?start=link_CODE, the bot links it (linkHandlers →
 * identity.redeemWebLinkCode), and this sheet sees the account change. Someone who used the bot before connects the same
 * Telegram and gets their existing wallet back (identityV2.adoptIntoTelegram folds the new, empty account into it).
 * The iOS app leaves out the referral commission (App Store 3.1.5(v) — see src/lib/platform.ts).
 */
export function ConnectTelegram({ onLinked, onLater }: { onLinked: () => void; onLater: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [linked, setLinked] = useState(false);
  const ios = isIOSApp();

  useEffect(() => {
    let live = true;
    kc<{ code: string }>('link/telegram-code', { method: 'POST' })
      .then(r => { if (live) setCode(r.code); })
      .catch(e => { if (!live) return; if (e instanceof KcError && e.status === 409) { setLinked(true); return; } setErr(e instanceof Error ? e.message : 'Could not prepare the link — try again'); });
    // Watch for the bot to finish the link (the person comes back from Telegram).
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try { const r = await kc<{ account: Account }>('me'); if (live && r.account.telegramLinked) setLinked(true); } catch { /* keep waiting */ }
    }, 3000);
    return () => { live = false; clearInterval(t); };
  }, []);

  if (linked) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-[#58834C]/12 text-[#58834C]"><IconCheck size={28} /></div>
        <div className="font-display text-[20px] font-bold text-ink dark:text-cream-warm">You’re all set</div>
        <p className="muted text-[14.5px]">Telegram is connected — the app and @{BOT} now share one wallet, balance and history.</p>
        <button onClick={onLinked} className="btn-primary w-full">Continue</button>
      </div>
    );
  }

  const benefits = [
    ...(ios ? [] : [{ Icon: IconGift, t: 'Your referral link', d: 'Earn 20% of the fees your friends pay — paid to your wallet, for as long as they use Kobocent.' }]),
    { Icon: IconGift, t: '$SHIFT points', d: 'Usage-reward points on your payments, trades and referrals.' },
    { Icon: IconShield, t: 'Never lose access', d: 'A second way into your wallet, and Kobocent on Telegram wherever you are.' },
  ];

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-ink dark:text-cream-warm">One last step: connect your Telegram to complete your registration.</p>
      <ul className="space-y-3">
        {benefits.map(b => (
          <li key={b.t} className="flex gap-3">
            <span className="shrink-0 grid place-items-center h-10 w-10 rounded-2xl bg-terracotta-soft text-terracotta"><b.Icon size={18} /></span>
            <span className="text-[14px] leading-relaxed"><b className="text-ink dark:text-cream-warm">{b.t}.</b> <span className="muted">{b.d}</span></span>
          </li>
        ))}
      </ul>
      <p className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] leading-relaxed">Used Kobocent on Telegram before? Connect that same Telegram now, before adding money here — your existing wallet, balance and history come with it.</p>

      {err ? <p className="text-[14px]" style={{ color: '#B84A40' }}>{err}</p>
        : code ? (
          <>
            <a href={`https://t.me/${BOT}?start=link_${code}`} target="_blank" rel="noopener noreferrer" className="btn-primary w-full inline-flex items-center justify-center gap-2"><IconTelegram />Connect Telegram</a>
            <p className="text-center text-[12.5px] muted">Opens @{BOT} — tap <b>Start</b> and you’re connected. No Telegram app here? Send <span className="font-mono">/link {code}</span> to @{BOT} within 10 minutes.</p>
          </>
        ) : <div className="h-12 rounded-full bg-cream-warm dark:bg-night animate-pulse" />}
      <button onClick={onLater} className="block w-full text-center text-[14px] muted min-h-[44px]">Later</button>
    </div>
  );
}
