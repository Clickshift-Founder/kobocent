'use client';

/**
 * Cashback at checkout (2026-10-24). The 0.2% cashback every payment earns is no longer sent to the wallet — it builds
 * a spendable balance that the review step offers as a switch: on, the user's cashback comes off Kobocent's fee, so
 * they pay less (bank transfer, bills) or receive more naira (withdrawal). The server decides the offer (fee-capped,
 * shown from ₦50) and re-checks it when the payment runs.
 */
import { IconGift } from './Icons';

export interface CashbackOffer {
  spendableUsd: number;
  spendableNgn: number;
  discountUsd: number;
  discountNgn: number;
  available: boolean;
  minNgn: number;
}

const ngn = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** The discount that applies with the switch in this position (0 when off or not on offer). */
export function cashbackOff(offer: CashbackOffer | null | undefined, on: boolean) {
  return on && offer?.available ? { usd: offer.discountUsd, ngn: offer.discountNgn } : { usd: 0, ngn: 0 };
}

export function CashbackToggle({ offer, on, onChange, mode }: {
  offer: CashbackOffer | null | undefined;
  on: boolean;
  onChange: (on: boolean) => void;
  mode: 'pay' | 'receive';
}) {
  if (!offer?.available) return null;
  const rest = offer.spendableNgn - offer.discountNgn;
  return (
    <div className={`mt-4 rounded-2xl border p-4 flex items-center gap-3 transition-colors ${on ? 'border-terracotta bg-terracotta/5' : 'border-cream-border dark:border-night-border'}`}>
      <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-xl ${on ? 'bg-terracotta text-white' : 'bg-cream-warm dark:bg-night text-terracotta'}`}><IconGift size={18} /></span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] text-ink dark:text-cream-warm">Use {ngn(offer.discountNgn)} cashback</div>
        <div className="text-[13px] muted leading-snug">
          {on
            ? (mode === 'receive' ? `You receive ${ngn(offer.discountNgn)} more.` : `You pay ${ngn(offer.discountNgn)} less.`) + (rest >= 1 ? ` ${ngn(rest)} stays for next time.` : '')
            : `You have ${ngn(offer.spendableNgn)} spendable from your payments.`}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={`Use ${ngn(offer.discountNgn)} cashback`} onClick={() => onChange(!on)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-terracotta' : 'bg-cream-border dark:bg-night-border'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}
