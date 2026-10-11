'use client';
import { useCallback, useEffect, useState } from 'react';
import { kc, KcError, usd } from '@/lib/kc';
import { PageHeader } from '@/components/app/PageHeader';
import { Skeleton } from '@/components/app/ui';
import { IconCheck, IconBolt, IconChart, IconShield, IconTrophy } from '@/components/app/Icons';
import { SubscribeSheet, StatusPill, dateLabel, type Hub, type Product, type ProductId } from '@/components/app/premium';
import { CopyPanel } from '@/components/app/CopyPanel';
import { SniperPanel } from '@/components/app/SniperPanel';
import { AlertsPanel, TrackLine } from '@/components/app/AlertsPanel';

/**
 * Trade T4 — the premium hub (2026-10-11). Ultra, Copy Pro (Alpha wallets + Smart Money alerts), Sniper Pro — the same engines as
 * Telegram. The Plans tab justifies each price with the user's own numbers (from their records) and the alerts' real track record.
 * Tabs live in the URL (?tab=copy|sniper|alerts) so phone notifications can open the right one; ?mint= pre-fills the sniper.
 */

type Tab = 'plans' | 'copy' | 'sniper' | 'alerts';
const TABS: Array<[Tab, string]> = [['plans', 'Plans'], ['copy', 'Copy'], ['sniper', 'Sniper'], ['alerts', 'Alerts']];
const ICON: Record<ProductId, React.ReactNode> = { pro: <IconTrophy size={22} />, ultra: <IconBolt size={22} />, copy: <IconChart size={22} />, sniper: <IconShield size={22} /> };

interface Payment { name: string; plan: string; amountUsd: number; paidFrom: string | null; explorerUrl: string | null; status: string; expiresAt: number | null; at: number }

export default function PremiumPage() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [err, setErr] = useState('');
  const [needsLink, setNeedsLink] = useState(false);
  const [tab, setTab] = useState<Tab>('plans');
  const [mint, setMint] = useState<string | null>(null);
  const [sub, setSub] = useState<Product | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  const load = useCallback(() => kc<Hub>('premium').then(h => { setHub(h); setErr(''); }).catch(e => {
    if (e instanceof KcError && e.status === 409) setNeedsLink(true); else setErr(e instanceof Error ? e.message : 'Could not load Premium');
  }), []);
  useEffect(() => {
    load();
    kc<{ payments: Payment[] }>('premium/payments').then(r => setPayments(r.payments)).catch(() => setPayments([]));
    try {
      const q = new URLSearchParams(window.location.search);
      const t = q.get('tab') as Tab | null;
      if (t && TABS.some(([k]) => k === t)) setTab(t);
      const m = q.get('mint');
      if (m && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m)) { setMint(m); if (!t) setTab('sniper'); }
    } catch { /* no window */ }
  }, [load]);
  const pickTab = (t: Tab) => {
    setTab(t);
    try { const u = new URL(window.location.href); u.searchParams.set('tab', t); window.history.replaceState(null, '', u.toString()); } catch { /* ignore */ }
  };
  const open = (id: ProductId) => { const p = hub?.products.find(x => x.id === id); if (p) setSub(p); };
  const done = () => { load(); kc<{ payments: Payment[] }>('premium/payments').then(r => setPayments(r.payments)).catch(() => {}); };

  if (needsLink) return <div className="space-y-6"><PageHeader title="Premium" fallback="/app/trade" /><div className="surface rounded-3xl p-6 text-center muted">Connect your Telegram account in Settings to use Premium on the web.</div></div>;

  const st = hub?.status;
  const activeCount = st ? (st.pro?.active ? 1 : [st.ultra, st.copy, st.sniper].filter(s => s.active).length) : 0;
  // Kobocent Pro first — the bundle is the headline; single plans follow for one-feature traders.
  const ordered = hub ? [...hub.products].sort((a, b) => (a.id === 'pro' ? -1 : b.id === 'pro' ? 1 : 0)) : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Premium" subtitle="Faster trades, the best wallets to copy, snipes at your price — on the same engine as Telegram." fallback="/app/trade" />

      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night-card sticky top-2 z-10" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => pickTab(k)}
            className={`min-h-[44px] rounded-xl text-[14px] font-semibold transition-colors ${tab === k ? 'bg-white dark:bg-night text-ink dark:text-cream-warm shadow-sm' : 'muted'}`}>{label}</button>
        ))}
      </div>

      {err && <div className="surface rounded-2xl p-5 text-[15px]">{err} <button onClick={() => load()} className="underline font-semibold">Retry</button></div>}

      {tab === 'plans' && (!hub ? <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div> : (
        <div className="space-y-4">
          <section className="rounded-3xl p-5 text-white bg-ink dark:bg-night-card relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-terracotta/30 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="text-[13px] text-white/70">{activeCount ? `${activeCount} plan${activeCount === 1 ? '' : 's'} active` : 'Your plans'}</div>
              <div className="mt-3 space-y-2">
                {ordered.map(p => {
                  const s = hub.status[p.id];
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3.5 py-2.5">
                      <span className="flex items-center gap-2 font-semibold text-[15px]">{ICON[p.id]}{p.name}</span>
                      <span className="text-[12.5px] text-white/80">{s.active ? `until ${dateLabel(s.expiresAt)}` : 'not active'}</span>
                    </div>
                  );
                })}
              </div>
              {!hub.watchersLive && <p className="text-[12.5px] text-white/70 mt-3">Copy trading and alerts are paused while we switch the node that watches wallets — they resume on their own.</p>}
            </div>
          </section>

          {ordered.map(p => {
            const s = hub.status[p.id];
            const inPro = p.id !== 'pro' && !!hub.status.pro?.active;
            const isPro = p.id === 'pro';
            const paid30 = (n0: Hub['numbers']) => (n0.ultra.perTradeFeesUsd || 0) + (n0.copy.feesUsd || 0) + (n0.sniper.feesUsd || 0);
            const n = hub.numbers;
            const monthly = p.plans.find(x => x.id === 'monthly');
            const quarterly = p.plans.find(x => x.id === 'quarterly');
            const proof = isPro
              ? (paid30(n) > 0 ? <>In the last 30 days you paid about <b>{usd(paid30(n))}</b> in Ultra, copy and snipe fees that Pro removes. </> : null)
              : p.id === 'ultra'
              ? (n.ultra.trades ? <>In the last 30 days you made <b>{n.ultra.trades} Ultra trade{n.ultra.trades === 1 ? '' : 's'}</b> worth <b>{usd(n.ultra.volumeUsd)}</b> — about <b>{usd(n.ultra.perTradeFeesUsd)}</b> in the 3% Ultra fee. </> : null)
              : p.id === 'copy'
                ? <>Smart Money alerts, last {hub.alertsSummary.days} days: <TrackLine s={hub.alertsSummary} />.{n.copy.feesUsd ? <> You paid <b>{usd(n.copy.feesUsd)}</b> in copy fees in 30 days.</> : null} </>
                : (n.sniper.snipes ? <>You made <b>{n.sniper.snipes} snipe{n.sniper.snipes === 1 ? '' : 's'}</b> in 30 days and paid <b>{usd(n.sniper.feesUsd)}</b> in snipe fees. </> : null);
            const rule = isPro ? `Bought one by one: Ultra $20 + Copy Pro $20 + Sniper Pro $20 + Alpha Alerts $25 = $85. Pro is $${monthly?.usd ?? 35}.`
              : p.id === 'ultra' ? `Pays for itself once you trade over ${usd(n.ultra.breakEvenUsd)} a month with Ultra.`
              : p.id === 'sniper' ? 'Pays for itself once you snipe over $667 a month (3% saved) — or $333 if you snipe with Ultra (another 3% saved).' : 'One plan: Alpha wallets, no per-trade fees on them, and every alert.';
            return (
              <section key={p.id} className={`surface rounded-3xl p-5 relative ${isPro ? 'border-2 border-terracotta' : s.active ? 'border-[#58834C]/40' : ''}`}>
                {isPro && <span className="absolute -top-3 left-5 rounded-full bg-terracotta text-white text-[12px] font-semibold px-3 py-1">Best value · save ${85 - (monthly?.usd ?? 35)}</span>}
                <div className="flex items-start gap-3">
                  <span className="grid place-items-center h-12 w-12 shrink-0 rounded-2xl bg-terracotta-soft text-terracotta">{ICON[p.id]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-display font-bold text-[21px] text-ink dark:text-cream-warm">{p.name}</h2><StatusPill s={s} /></div>
                    <p className="muted text-[14px] mt-1 leading-relaxed">{p.tagline}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display font-bold text-[30px] text-ink dark:text-cream-warm">${monthly?.usd}</span>
                  <span className="muted text-[14px]">/ 30 days{quarterly ? ` · or $${quarterly.usd} / 90 days` : ''}</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {p.perks.map(x => <li key={x} className="flex gap-2 text-[14px] text-ink dark:text-cream-warm"><IconCheck size={16} className="text-[#58834C] shrink-0 mt-0.5" />{x}</li>)}
                </ul>
                <div className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-3.5 text-[13.5px] text-ink dark:text-cream-warm leading-relaxed">
                  <span className="text-[11.5px] uppercase tracking-wide font-semibold muted block mb-1">Your numbers</span>
                  {proof}{rule}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {inPro ? <span className="grid place-items-center rounded-2xl bg-cream-warm dark:bg-night text-[14px] font-semibold text-[#58834C] min-h-[48px]">Included in Pro</span>
                    : <button onClick={() => setSub(p)} className="btn-primary">{s.active ? 'Renew' : `Get ${p.name}`}</button>}
                  <button onClick={() => pickTab(p.id === 'copy' || isPro ? 'copy' : p.id === 'sniper' ? 'sniper' : 'plans')} className="btn-ghost" disabled={p.id === 'ultra'}>
                    {p.id === 'ultra' ? 'Use on any trade' : p.id === 'copy' || isPro ? 'See wallets' : 'Open Sniper'}
                  </button>
                </div>
                {(isPro || p.id === 'sniper' || p.id === 'copy') && s.active && !inPro && (
                  <AutoRenew product={p.id} on={!!s.autoRenew} onChange={load} />
                )}
              </section>
            );
          })}

          {payments && payments.length > 0 && (
            <section className="surface rounded-2xl px-4">
              <h2 className="pt-4 pb-2 font-semibold text-[15px] text-ink dark:text-cream-warm">Payments</h2>
              <ul className="divide-y divide-cream-border dark:divide-night-border">
                {payments.map((x, i) => (
                  <li key={i} className="py-3 flex items-center gap-3 text-[14px]">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink dark:text-cream-warm">{x.name} · {x.plan === 'quarterly' ? '90 days' : '30 days'}</div>
                      <div className="text-[12.5px] muted truncate">{dateLabel(x.at)}{x.paidFrom ? ` · ${x.paidFrom}` : ''}{x.status !== 'paid' ? ` · ${x.status === 'unconfirmed' ? 'confirming' : 'being switched on by our team'}` : ''}</div>
                    </div>
                    <span className="font-mono font-semibold">{usd(x.amountUsd)}</span>
                    {x.explorerUrl && <a href={x.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-terracotta min-h-[44px] leading-[44px]">Proof</a>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-[12.5px] muted leading-relaxed">{hub.payNote} {hub.disclaimer}</p>
        </div>
      ))}

      {tab === 'copy' && <CopyPanel hub={hub} onSubscribe={() => open('copy')} />}
      {tab === 'sniper' && <SniperPanel hub={hub} initialMint={mint} onSubscribe={() => open('sniper')} />}
      {tab === 'alerts' && <AlertsPanel hub={hub} onSubscribe={() => open('copy')} />}

      <SubscribeSheet product={sub} status={sub && hub ? hub.status[sub.id] : null} open={!!sub} onClose={() => setSub(null)} onDone={done} />
    </div>
  );
}

function AutoRenew({ product, on, onChange }: { product: ProductId; on: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  async function flip() {
    setBusy(true);
    try { await kc('premium/autorenew', { method: 'POST', body: { product, on: !on } }); onChange(); } catch { /* shown on next load */ }
    finally { setBusy(false); }
  }
  return (
    <button onClick={flip} disabled={busy} className="mt-3 w-full flex items-center justify-between min-h-[48px] text-[14px] text-ink dark:text-cream-warm">
      <span>Auto-renew from your Kobocent wallet <span className="muted">(when it ends — USDC/USDT, else SOL)</span></span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-[#58834C]' : 'bg-cream-border dark:bg-night-border'}`} aria-hidden><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} /></span>
    </button>
  );
}
