'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { kc } from '@/lib/kc';
import { Skeleton } from './ui';
import { ErrorNote } from './ErrorNote';
import { HoldToConfirm, newKey } from './money';
import { price, compact, pct, pnlColor, TokenAvatar } from './trade';
import { runPremiumJob, ago, until, type Hub } from './premium';

/**
 * Sniper on the web (T4, 2026-10-11) — the same sniper engine as Telegram. Snipe now, or set a price: buy the dip (price falls to)
 * or the breakout (price rises to), checked every 5 seconds, with its own expiry. Rug check before every snipe; take profit /
 * stop loss can be set on the fill. Sniper Pro: no 3% fee, Ultra included. Fees are taken only after a buy lands.
 * Backend /premium/snipe/preview, /premium/snipe (job), /premium/snipes, /premium/snipe/cancel.
 */

interface Preview {
  ok: true; mint: string; symbol: string; name: string; priceUsd: number | null; marketCapUsd: number | null; liquidityUsd: number | null;
  change: { m5?: number | null; h1?: number | null } | null; ageHours: number | null;
  recommended: { takeProfitPct: number | null; stopLossPct: number | null } | null;
  risk: { verdict: 'danger' | 'caution' | 'clear' | null; danger: string[]; warnings: string[]; lpLockedPct: number | null; checked: boolean };
  fees: { pro: boolean; ultraIncluded: boolean; feePct: number; ultraFeePct: number }; balanceSol: number | null; maxSol: number | null; limits: { minSol: number; maxSol: number };
}
interface Snipe { id: number; mint: string; symbol: string; mode: 'now' | 'limit'; status: 'pending' | 'buying' | 'filled' | 'failed' | 'cancelled'; amountSol: number; ultra: boolean; targetPriceUsd: number | null; direction: 'below' | 'above'; expiresAt: number | null; entryPriceUsd: number | null; priceNowUsd: number | null; changePct: number | null; toTargetPct: number | null; feeSol: number; error: string | null; at: number | null; explorerUrl: string | null }
interface SnipeList { ok: true; pro: boolean; snipes: Snipe[] }
interface SnipeResult { ok: boolean; code?: string; error?: string; mode?: 'now' | 'limit'; symbol?: string; spentSol?: number; feeSol?: number; tokens?: number; entryPriceUsd?: number; protected?: boolean | null; explorerUrl?: string | null; targetPriceUsd?: number; direction?: string; expiresAt?: number; warning?: string | null; risk?: Preview['risk'] }

const AMOUNTS = [0.05, 0.1, 0.25, 0.5];
const DIP = [-10, -20, -30, -50];
const BREAK = [10, 25, 50, 100];
const EXPIRY = [{ label: '1 h', v: 1 }, { label: '6 h', v: 6 }, { label: '24 h', v: 24 }, { label: '3 days', v: 72 }, { label: '7 days', v: 168 }];
const TP = [{ label: '+50%', v: 50 }, { label: '2×', v: 100 }, { label: '3×', v: 200 }, { label: '5×', v: 400 }];
const SL = [15, 25, 40];
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const VERDICT: Record<string, { label: string; color: string }> = { clear: { label: 'No major rug flags', color: '#58834C' }, caution: { label: 'Some warnings', color: '#B68B2A' }, danger: { label: 'Danger flags', color: '#B84A40' } };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={`min-h-[44px] rounded-xl border px-2 text-[14px] font-semibold transition-colors ${on ? 'border-terracotta bg-terracotta-soft text-terracotta' : 'border-cream-border dark:border-night-border text-ink dark:text-cream-warm'}`}>{children}</button>;
}

export function SniperPanel({ hub, initialMint, onSubscribe }: { hub: Hub | null; initialMint?: string | null; onSubscribe: () => void }) {
  const [mint, setMint] = useState(initialMint || '');
  const [pv, setPv] = useState<Preview | null>(null);
  const [pvErr, setPvErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'now' | 'limit'>('now');
  const [amt, setAmt] = useState(0.1);
  const [customAmt, setCustomAmt] = useState('');
  const [dir, setDir] = useState<'below' | 'above'>('below');
  const [movePct, setMovePct] = useState<number | null>(-20);
  const [target, setTarget] = useState('');
  const [hours, setHours] = useState(24);
  const [ultra, setUltra] = useState(false);
  const [tp, setTp] = useState<number | null>(null);
  const [sl, setSl] = useState<number | null>(null);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<SnipeResult | null>(null);
  const [list, setList] = useState<SnipeList | null>(null);
  const keyRef = useRef(newKey());

  const loadList = useCallback(() => kc<SnipeList>('premium/snipes').then(setList).catch(() => {}), []);
  useEffect(() => { loadList(); const t = window.setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, 10_000); return () => window.clearInterval(t); }, [loadList]);

  useEffect(() => {
    const m = mint.trim();
    setPvErr(''); setResult(null); setErr(''); setAccept(false);
    if (!MINT_RE.test(m)) { setPv(null); return; }
    let live = true; setLoading(true);
    kc<Preview>(`premium/snipe/preview?mint=${m}`).then(r => { if (live) { setPv(r); if (r.fees.ultraIncluded) setUltra(true); } })
      .catch(e => { if (live) { setPv(null); setPvErr(e instanceof Error ? e.message : 'We couldn’t load this token'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [mint]);

  const value = customAmt ? Number(customAmt) : amt;
  const now = pv?.priceUsd || null;
  const targetPrice = target ? Number(target) : now && movePct != null ? now * (1 + movePct / 100) : null;
  const feeSol = pv ? value * (pv.fees.feePct / 100) : 0;
  const ultraFee = ultra && pv && !pv.fees.ultraIncluded ? value * 0.03 : 0;
  const needsAccept = pv?.risk.verdict === 'danger';
  const ready = !!pv && value >= (pv.limits.minSol) && value <= pv.limits.maxSol && (mode === 'now' || (targetPrice != null && targetPrice > 0)) && (!needsAccept || accept);

  async function go() {
    if (!pv || !ready) return;
    setBusy(true); setErr('');
    try {
      const r = await runPremiumJob<SnipeResult>('premium/snipe', {
        mint: pv.mint, amountSol: value, mode, ultra, targetPriceUsd: mode === 'limit' ? targetPrice : null, direction: dir, expiresHours: hours,
        takeProfitPct: tp, stopLossPct: sl, acceptRisk: accept, idempotencyKey: keyRef.current,
      });
      keyRef.current = newKey();
      if (r.ok) { setResult(r); loadList(); }
      else setErr(r.error || 'It did not go through — nothing was spent.');
    } catch (e) { setErr(e instanceof Error ? e.message : 'It did not go through — nothing was spent.'); keyRef.current = newKey(); }
    finally { setBusy(false); }
  }

  const pending = list?.snipes.filter(s => s.status === 'pending' || s.status === 'buying') || [];
  const past = list?.snipes.filter(s => s.status !== 'pending' && s.status !== 'buying').slice(0, 12) || [];

  return (
    <div className="space-y-5">
      {!hub?.status.sniper.active && (
        <button onClick={onSubscribe} className="w-full text-left rounded-2xl border border-dashed border-terracotta/60 p-4 min-h-[64px]">
          <div className="font-semibold text-[15px] text-ink dark:text-cream-warm">Sniper Pro — $20 / 30 days</div>
          <div className="text-[13px] muted mt-0.5">No 3% snipe fee and Ultra speed included. On a 0.5 SOL snipe that’s {(0.5 * 0.06).toFixed(3)} SOL saved each time.</div>
        </button>
      )}

      {/* Token */}
      <div className="surface rounded-2xl flex items-center gap-2 px-4 min-h-[52px] focus-within:border-terracotta">
        <input value={mint} onChange={e => setMint(e.target.value.trim())} placeholder="Paste the token address to snipe" aria-label="Token address"
          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] font-mono text-ink dark:text-cream-warm py-3" autoComplete="off" spellCheck={false} />
        {loading && <span className="h-4 w-4 rounded-full border-2 border-terracotta border-t-transparent animate-spin" aria-label="Loading" />}
      </div>
      <ErrorNote msg={pvErr} />

      {pv && !result && (
        <section className="space-y-4 animate-fade-up">
          <div className="surface rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <TokenAvatar symbol={pv.symbol} size={44} />
              <div className="min-w-0 flex-1">
                <Link href={`/app/trade/${pv.mint}`} className="font-semibold text-[16px] text-ink dark:text-cream-warm">{pv.symbol} <span className="font-normal muted text-[13px]">{pv.name}</span></Link>
                <div className="text-[12.5px] muted font-mono">{price(now)} · MC {compact(pv.marketCapUsd)} · Liq {compact(pv.liquidityUsd)}{pv.ageHours != null ? ` · ${pv.ageHours < 1 ? `${Math.round(pv.ageHours * 60)} min` : pv.ageHours < 48 ? `${Math.round(pv.ageHours)} h` : `${Math.round(pv.ageHours / 24)} d`} old` : ''}</div>
              </div>
              {pv.change?.m5 != null && <span className="text-[13px] font-mono shrink-0" style={{ color: pnlColor(pv.change.m5) }}>5m {pct(pv.change.m5)}</span>}
            </div>
            <div className="mt-3 rounded-xl p-3 text-[13.5px]" style={{ background: pv.risk.verdict ? VERDICT[pv.risk.verdict].color + '14' : undefined }}>
              {pv.risk.verdict ? (
                <>
                  <div className="font-semibold" style={{ color: VERDICT[pv.risk.verdict].color }}>Rug check: {VERDICT[pv.risk.verdict].label}</div>
                  {[...pv.risk.danger, ...pv.risk.warnings].length > 0 && <div className="text-ink dark:text-cream-warm mt-0.5">{[...pv.risk.danger, ...pv.risk.warnings].slice(0, 4).join(' · ')}</div>}
                  {pv.risk.lpLockedPct != null && <div className="muted mt-0.5">{Math.round(pv.risk.lpLockedPct)}% of liquidity locked</div>}
                </>
              ) : <div className="muted">Rug check unavailable right now — be extra careful.</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-cream-warm dark:bg-night-card" role="tablist">
            {([['now', 'Snipe now'], ['limit', 'At a price']] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`min-h-[44px] rounded-xl text-[14px] font-semibold ${mode === k ? 'bg-white dark:bg-night text-ink dark:text-cream-warm shadow-sm' : 'muted'}`}>{l}</button>
            ))}
          </div>

          {mode === 'limit' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Chip on={dir === 'below'} onClick={() => { setDir('below'); setMovePct(-20); setTarget(''); }}>Buy the dip</Chip>
                <Chip on={dir === 'above'} onClick={() => { setDir('above'); setMovePct(25); setTarget(''); }}>Buy the breakout</Chip>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(dir === 'below' ? DIP : BREAK).map(p => <Chip key={p} on={!target && movePct === p} onClick={() => { setMovePct(p); setTarget(''); }}>{p > 0 ? '+' : '−'}{Math.abs(p)}%</Chip>)}
              </div>
              <input value={target} onChange={e => setTarget(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder={`Or type a price in $ (now ${price(now)})`}
                className="w-full surface rounded-2xl px-4 min-h-[48px] text-[16px] font-mono outline-none focus:border-terracotta" />
              <p className="text-[13px] muted">Buys when the price {dir === 'below' ? 'falls to' : 'rises to'} <b className="text-ink dark:text-cream-warm font-mono">{price(targetPrice)}</b>{now && targetPrice ? ` (${pct((targetPrice / now - 1) * 100)} from now)` : ''}. Checked every 5 seconds.</p>
              <div>
                <div className="text-[13px] muted mb-1.5">Cancel if it hasn’t happened within</div>
                <div className="grid grid-cols-5 gap-1.5">{EXPIRY.map(x => <Chip key={x.v} on={hours === x.v} onClick={() => setHours(x.v)}>{x.label}</Chip>)}</div>
              </div>
            </div>
          )}

          <div>
            <div className="text-[13px] muted mb-1.5">SOL to spend{pv.balanceSol != null ? ` · you have ${pv.balanceSol.toFixed(3)} SOL` : ''}</div>
            <div className="grid grid-cols-5 gap-1.5">
              {AMOUNTS.map(a => <Chip key={a} on={!customAmt && amt === a} onClick={() => { setAmt(a); setCustomAmt(''); }}>{a}</Chip>)}
              <Chip on={!!customAmt && Number(customAmt) === pv.maxSol} onClick={() => setCustomAmt(String(pv.maxSol ?? ''))}>Max</Chip>
            </div>
            <input value={customAmt} onChange={e => setCustomAmt(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="Or type an amount"
              className="mt-2 w-full surface rounded-2xl px-4 min-h-[48px] text-[16px] outline-none focus:border-terracotta" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Chip on={!ultra} onClick={() => setUltra(false)}>Normal</Chip>
            <Chip on={ultra} onClick={() => setUltra(true)}>Ultra {pv.fees.ultraIncluded ? '· included' : '· +3%'}</Chip>
          </div>

          <details className="surface rounded-2xl px-4" open={!!(tp || sl)}>
            <summary className="py-3.5 min-h-[48px] cursor-pointer list-none flex justify-between text-[14px] font-semibold text-ink dark:text-cream-warm">
              Protect it once it buys <span className="muted font-normal">{tp || sl ? `${tp ? `TP +${tp}%` : ''}${tp && sl ? ' · ' : ''}${sl ? `SL −${sl}%` : ''}` : 'optional'}</span>
            </summary>
            <div className="pb-4 space-y-3">
              {pv.recommended?.takeProfitPct && pv.recommended?.stopLossPct ? (
                <button onClick={() => { setTp(Math.round(pv.recommended!.takeProfitPct!)); setSl(Math.round(pv.recommended!.stopLossPct!)); }} className="w-full rounded-xl border border-terracotta text-terracotta font-semibold min-h-[44px] text-[14px]">
                  Use suggested: +{Math.round(pv.recommended.takeProfitPct)}% / −{Math.round(pv.recommended.stopLossPct)}%
                </button>
              ) : null}
              <div><div className="text-[13px] muted mb-1.5">Take profit</div><div className="grid grid-cols-5 gap-1.5">{TP.map(x => <Chip key={x.v} on={tp === x.v} onClick={() => setTp(tp === x.v ? null : x.v)}>{x.label}</Chip>)}<Chip on={tp === null} onClick={() => setTp(null)}>None</Chip></div></div>
              <div><div className="text-[13px] muted mb-1.5">Stop loss</div><div className="grid grid-cols-4 gap-1.5">{SL.map(x => <Chip key={x} on={sl === x} onClick={() => setSl(sl === x ? null : x)}>−{x}%</Chip>)}<Chip on={sl === null} onClick={() => setSl(null)}>None</Chip></div></div>
              <p className="text-[12.5px] muted">Measured from your entry and checked every 3 seconds, 24/7. Sells into USDC, so no SOL is needed.</p>
            </div>
          </details>

          <div className="rounded-2xl bg-cream-warm dark:bg-night p-4 text-[13.5px] space-y-1">
            <div className="flex justify-between"><span className="muted">You spend</span><span className="font-semibold font-mono text-ink dark:text-cream-warm">{value || '—'} SOL</span></div>
            <div className="flex justify-between"><span className="muted">Snipe fee</span><span className="font-mono text-ink dark:text-cream-warm">{pv.fees.feePct ? `${feeSol.toFixed(4)} SOL (3%)` : 'None — Sniper Pro'}</span></div>
            {ultra && <div className="flex justify-between"><span className="muted">Ultra</span><span className="font-mono text-ink dark:text-cream-warm">{ultraFee ? `${ultraFee.toFixed(4)} SOL (3%)` : 'Included'}</span></div>}
            <div className="flex justify-between"><span className="muted">Trading fee</span><span className="font-mono text-ink dark:text-cream-warm">1%</span></div>
            <p className="muted pt-1">Fees are taken only if the buy goes through.{mode === 'limit' ? ' Keep this SOL in your wallet until it fills.' : ''}</p>
          </div>

          {needsAccept && (
            <label className="flex items-start gap-3 rounded-2xl p-4 cursor-pointer" style={{ background: '#B84A4014' }}>
              <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="mt-1 h-5 w-5 accent-[#B84A40]" />
              <span className="text-[14px] text-ink dark:text-cream-warm">This token has danger flags. I understand I could lose everything I put in.</span>
            </label>
          )}
          <ErrorNote msg={err} />
          {ready || busy
            ? <HoldToConfirm label={mode === 'now' ? `Hold to snipe ${value || ''} SOL` : `Hold to set the snipe`} onConfirm={go} busy={busy} />
            : <button disabled className="w-full rounded-2xl bg-cream-warm dark:bg-night muted font-semibold min-h-[60px] text-[15px]">
                {needsAccept && !accept ? 'Tick the risk box to continue' : !(value >= pv.limits.minSol) ? `At least ${pv.limits.minSol} SOL` : value > pv.limits.maxSol ? `At most ${pv.limits.maxSol} SOL` : 'Choose the price'}
              </button>}
        </section>
      )}

      {result && (
        <section className="surface rounded-3xl p-5 animate-fade-up" aria-live="polite">
          <div className="font-display font-bold text-[22px] text-ink dark:text-cream-warm">{result.mode === 'now' ? `Sniped ${result.symbol}` : `Snipe set for ${result.symbol}`}</div>
          {result.mode === 'now' ? (
            <p className="text-[14.5px] muted mt-1 leading-relaxed">Spent {result.spentSol?.toFixed(4)} SOL{result.entryPriceUsd ? ` at ${price(result.entryPriceUsd)}` : ''}.{result.feeSol ? ` Fee ${result.feeSol.toFixed(4)} SOL.` : ''}{result.protected ? ' Take profit / stop loss are set.' : result.protected === false ? ' We couldn’t set take profit / stop loss — set them on the token page.' : ''}</p>
          ) : (
            <p className="text-[14.5px] muted mt-1 leading-relaxed">Buys {result.direction === 'above' ? 'when the price rises to' : 'when the price falls to'} {price(result.targetPriceUsd)} · cancels in {until(result.expiresAt)}. You’ll get a notification when it fills.{result.warning ? ` ${result.warning}` : ''}</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {result.mode === 'now' ? <Link href={`/app/trade/${pv?.mint || mint}`} className="btn-primary text-center">Open {result.symbol}</Link> : <button onClick={() => setResult(null)} className="btn-primary">Set another</button>}
            {result.explorerUrl ? <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-center">Proof</a> : <button onClick={() => { setResult(null); setMint(''); }} className="btn-ghost">New snipe</button>}
          </div>
        </section>
      )}

      {/* Your snipes */}
      <section>
        <h2 className="font-semibold text-[16px] text-ink dark:text-cream-warm mb-2">Your snipes</h2>
        {!list ? <Skeleton className="h-20" /> : pending.length + past.length === 0 ? (
          <div className="surface rounded-2xl p-4 text-[14px] muted">No snipes yet. Paste a token above.</div>
        ) : (
          <ul className="space-y-2">
            {pending.map(s => <SnipeRow key={s.id} s={s} onChange={loadList} />)}
            {past.map(s => <SnipeRow key={s.id} s={s} onChange={loadList} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function SnipeRow({ s, onChange }: { s: Snipe; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function cancel() {
    setBusy(true); setErr('');
    try { await kc('premium/snipe/cancel', { method: 'POST', body: { id: s.id } }); onChange(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not cancel'); }
    finally { setBusy(false); }
  }
  const color = s.status === 'filled' ? '#58834C' : s.status === 'failed' ? '#B84A40' : s.status === 'pending' || s.status === 'buying' ? '#C1502E' : '#6B5D52';
  return (
    <li className="surface rounded-2xl p-3.5">
      <div className="flex items-center gap-3">
        <TokenAvatar symbol={s.symbol} size={36} />
        <div className="min-w-0 flex-1">
          <Link href={`/app/trade/${s.mint}`} className="font-semibold text-[15px] text-ink dark:text-cream-warm">{s.symbol}</Link>
          <div className="text-[12.5px] muted truncate">
            {s.amountSol} SOL{s.ultra ? ' · Ultra' : ''} · {s.status === 'pending'
              ? `${s.direction === 'above' ? 'rises to' : 'falls to'} ${price(s.targetPriceUsd)}${s.toTargetPct != null ? ` (${pct(s.toTargetPct)} away)` : ''} · ${until(s.expiresAt)} left`
              : s.status === 'filled' ? `bought at ${price(s.entryPriceUsd)} · ${ago(s.at)}` : s.status === 'buying' ? 'buying now…' : s.status === 'failed' ? (s.error || 'did not go through') : `cancelled · ${ago(s.at)}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          {s.status === 'filled' && s.changePct != null ? <div className="font-mono font-semibold text-[15px]" style={{ color: pnlColor(s.changePct) }}>{pct(s.changePct)}</div>
            : <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: color + '1A', color }}>{s.status === 'pending' ? 'waiting' : s.status}</span>}
          {s.status === 'pending' && <button onClick={cancel} disabled={busy} className="block ml-auto mt-1 text-[13px] font-semibold text-[#B84A40] min-h-[36px]">{busy ? '…' : 'Cancel'}</button>}
          {s.status === 'filled' && s.explorerUrl && <a href={s.explorerUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-[12.5px] font-semibold text-terracotta">Proof</a>}
        </div>
      </div>
      <ErrorNote msg={err} />
    </li>
  );
}
