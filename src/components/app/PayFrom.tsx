'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { kc, usd, amount } from '@/lib/kc';
import { Sheet } from './ui';
import { IconCheck } from './Icons';

/**
 * "Pay from" — spend from any chain (2026-10-07). Shared by Withdraw, Send to bank and Bills.
 * Lists Solana USDC/USDT (one option, the classic path) plus every other balance the user holds
 * (SOL; USDT/USDC on Ethereum, BNB Chain, Polygon, Arbitrum; ETH, BNB, POL, ETH on Arbitrum and
 * Robinhood Chain). Picks the cheapest balance that covers the amount until the user chooses.
 * Backend: GET /withdraw/sources; quotes/payments take `from` (omitted for Solana stablecoins).
 */

export interface Source { id: string; chain: string; chainLabel: string; symbol: string; kind: 'solana_stable' | 'sol' | 'evm_stable' | 'evm_native'; balance: number | null; priceUsd: number | null; valueUsd: number | null }
export interface NetworkFee { payer: 'user' | 'kobocent' | 'recovered'; native: string; amount: number; usd: number | null }
export interface Funding { sourceId: string; label: string; chain: string; chainLabel: string; collect: { amount: number; symbol: string } | null; priceUsd: number; networkFee: NetworkFee | null; eta?: string }
export interface JobFunding { label: string; amount: number; asset: string; explorerUrl: string | null }
export interface PayFromOption { id: string; title: string; sub: string; symbol: string; kind: Source['kind']; chain: string; balance: number | null; valueUsd: number | null }

export const SOLANA_STABLES = 'solana';

export function coinAmount(n: number) { return amount(n, n < 1 ? 6 : 4); }

// Solana stablecoins, then stablecoins on cheap chains, then SOL / native coins, then Ethereum stablecoins.
function rank(o: PayFromOption) {
  if (o.id === SOLANA_STABLES) return 0;
  if (o.kind === 'evm_stable') return o.chain === 'ETH' ? 4 : 1;
  if (o.kind === 'sol') return 2;
  return 3;
}

/** What the quote says about the source, as the screens word it. */
export function fundingLines(f: Funding | null | undefined) {
  if (!f) return { paidFrom: null as string | null, feeLine: null as string | null, priceNote: null as string | null };
  const nf = f.networkFee;
  const paidFrom = f.collect ? `${coinAmount(f.collect.amount)} ${f.collect.symbol} on ${f.chainLabel}` : null;
  const feeLine = !nf || nf.payer === 'kobocent' ? 'Covered by Kobocent'
    : nf.payer === 'user' ? `${coinAmount(nf.amount)} ${nf.native} from your balance${nf.usd ? ` (≈${usd(nf.usd)})` : ''}`
    : `${usd(nf.usd)} ${f.chainLabel} network fee`;
  const priceNote = f.collect && f.priceUsd !== 1 ? `Priced at ${usd(f.priceUsd)} per ${f.collect.symbol}, live — the exact amount is set the moment you confirm.` : null;
  return { paidFrom, feeLine, priceNote };
}

/** State for the picker. `needUsd` = roughly what the payment costs in dollars (for the automatic pick). */
export function usePayFrom(needUsd: number, solanaTotalOverride: number | null = null) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [from, setFrom] = useState(SOLANA_STABLES);
  const [manual, setManual] = useState(false);
  const [picking, setPicking] = useState(false);
  useEffect(() => { kc<{ sources: Source[] }>('withdraw/sources').then(r => setSources(r.sources)).catch(() => setSources([])); }, []);

  const options = useMemo<PayFromOption[]>(() => {
    const solTotal = solanaTotalOverride ?? (sources ? sources.filter(s => s.kind === 'solana_stable').reduce((t, s) => t + (s.valueUsd ?? 0), 0) : null);
    const sol: PayFromOption = { id: SOLANA_STABLES, title: 'USDC & USDT', sub: 'Solana', symbol: 'USD', kind: 'solana_stable', chain: 'SOLANA', balance: solTotal, valueUsd: solTotal };
    const rest = (sources || []).filter(s => s.kind !== 'solana_stable' && ((s.valueUsd ?? 0) >= 0.5 || (s.valueUsd === null && (s.balance ?? 0) > 0)))
      .map(s => ({ id: s.id, title: s.symbol, sub: s.chainLabel, symbol: s.symbol, kind: s.kind, chain: s.chain, balance: s.balance, valueUsd: s.valueUsd }))
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
    return [sol, ...rest];
  }, [sources, solanaTotalOverride]);

  useEffect(() => {
    if (manual) return;
    const covers = options.filter(o => (o.valueUsd ?? 0) >= needUsd);
    const best = covers.length ? [...covers].sort((a, b) => rank(a) - rank(b))[0] : [...options].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))[0];
    if (best && best.id !== from) setFrom(best.id);
  }, [needUsd, options, manual, from]);

  const sel = options.find(o => o.id === from) || options[0];
  const totalAll = options.reduce((s, o) => s + (o.valueUsd ?? 0), 0);
  const choose = (id: string) => { setFrom(id); setManual(true); setPicking(false); };
  /** Body fields for quote / pay calls: nothing for Solana stablecoins (the classic path). */
  const fromBody = sel.id === SOLANA_STABLES ? {} : { from: sel.id };
  return { sources, options, sel, from: sel.id, isSolana: sel.id === SOLANA_STABLES, manual, picking, setPicking, choose, totalAll, fromBody };
}
export type PayFromState = ReturnType<typeof usePayFrom>;

const CHAIN_COLOR: Record<string, string> = { SOLANA: '#7A5AF8', ETH: '#627EEA', BNB: '#D9A400', POLYGON: '#8247E5', ARBITRUM: '#2D74DA', ROBINHOOD: '#1F9D55' };
export function ChainBadge({ o }: { o: PayFromOption }) {
  return (
    <span className="relative grid place-items-center h-11 w-11 shrink-0 rounded-2xl bg-cream-warm dark:bg-night font-semibold text-[12.5px] text-ink dark:text-cream-warm">
      {o.id === SOLANA_STABLES ? '$' : o.symbol.slice(0, 4)}
      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-night-card" style={{ background: CHAIN_COLOR[o.chain] || '#C1502E' }} aria-hidden />
    </span>
  );
}

/** The "Pay from" row (shows the choice and the balance) + its sheet. Put it at the top of the form. */
export function PayFromPicker({ pf, note }: { pf: PayFromState; note?: string }) {
  if (pf.sources === null) {
    return <div className="surface rounded-2xl px-4 py-3 min-h-[64px] flex items-center gap-3"><span className="h-11 w-11 rounded-2xl bg-cream-warm dark:bg-night animate-pulse" /><span className="muted text-[14px]">Checking your balances…</span></div>;
  }
  const { sel } = pf;
  return (
    <>
      <button onClick={() => pf.setPicking(true)} className="w-full surface rounded-2xl px-4 py-3 flex items-center gap-3 text-left hover:border-terracotta transition-colors min-h-[64px]">
        <ChainBadge o={sel} />
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] muted">Pay from{!pf.manual && ' · cheapest picked for you'}</div>
          <div className="font-semibold text-ink dark:text-cream-warm truncate">{sel.title} <span className="muted font-normal">on {sel.sub}</span></div>
          <div className="text-[12.5px] muted">{sel.valueUsd !== null ? `${usd(sel.valueUsd)} available` : sel.balance !== null ? `${coinAmount(sel.balance)} ${sel.symbol}` : ''}{pf.options.length > 1 && pf.totalAll > (sel.valueUsd ?? 0) + 0.5 ? ` · ${usd(pf.totalAll)} across all balances` : ''}</div>
        </div>
        <span className="text-[13px] font-semibold text-terracotta">Change</span>
      </button>

      <Sheet open={pf.picking} onClose={() => pf.setPicking(false)} title="Pay from">
        <p className="muted text-[14px] -mt-1 mb-3">Spend from any balance — we handle the network behind the scenes.</p>
        <ul className="space-y-2">
          {pf.options.map(o => (
            <li key={o.id}>
              <button onClick={() => pf.choose(o.id)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 min-h-[64px] text-left transition-colors ${o.id === sel.id ? 'border-terracotta bg-terracotta-soft' : 'border-cream-border dark:border-night-border hover:border-terracotta'}`}>
                <ChainBadge o={o} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink dark:text-cream-warm">{o.title}</div>
                  <div className="muted text-[13px] truncate">{o.sub}{o.id !== SOLANA_STABLES && o.balance !== null ? ` · ${coinAmount(o.balance)} ${o.symbol}` : ''}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[14px] text-ink dark:text-cream-warm">{usd(o.valueUsd)}</div>
                  {o.id === sel.id && <IconCheck size={16} className="text-terracotta ml-auto mt-0.5" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {note && <p className="muted text-[13px] mt-3">{note}</p>}
        <div className="mt-4 rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px]">
          <div className="font-semibold text-ink dark:text-cream-warm">{pf.options.length > 1 ? 'Got coins elsewhere?' : 'Hold crypto on another chain?'}</div>
          <p className="muted mt-1 leading-relaxed">Send SOL, or USDT, USDC, ETH, BNB or POL on Ethereum, BNB Chain, Polygon, Arbitrum or Robinhood Chain to your Kobocent wallet — then spend it here. No bridging.</p>
          <Link href="/app/receive" className="inline-flex items-center gap-1 mt-2 font-semibold text-terracotta min-h-[44px]">Show my wallet addresses</Link>
        </div>
      </Sheet>
    </>
  );
}
