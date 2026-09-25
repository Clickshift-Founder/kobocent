/**
 * The product preview shown in the hero — deliberately the same shape a
 * user sees right after signing up, so the landing page and the app rhyme.
 */
export function BalanceCard() {
  return (
    <div className="surface rounded-3xl p-6 shadow-lift w-full max-w-[380px] animate-float">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-terracotta" />
          <span className="font-mono text-[11px] uppercase tracking-wider muted">Kobocent</span>
        </div>
        <span className="font-mono text-[11px] muted">9:41</span>
      </div>

      <div className="rounded-2xl bg-cream-warm dark:bg-night p-5 mb-4">
        <div className="eyebrow mb-1.5">Total balance</div>
        <div className="font-mono text-[32px] font-semibold text-ink dark:text-cream-warm leading-none mb-1.5">
          $1,926<span className="text-[20px] muted">.00</span>
        </div>
        <div className="text-[12.5px] muted">≈ ₦3,174,048 · earning 14% on $250</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: '↗', label: 'Send' },
          { icon: '＋', label: 'Add money' },
          { icon: '🌱', label: 'Earn' },
        ].map((a) => (
          <div key={a.label} className="rounded-xl border border-cream-border dark:border-night-border p-3 text-center">
            <div className="text-[17px] mb-1">{a.icon}</div>
            <div className="text-[11px] muted leading-tight">{a.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {[
          { icon: '🏦', title: 'Withdrawal · GTBank', sub: '2 min ago', amt: '−₦81,576', pos: false },
          { icon: '💡', title: 'AEDC electricity', sub: 'Token delivered', amt: '−₦2,000', pos: false },
          { icon: '🌱', title: 'Yield earned', sub: 'Accrued hourly', amt: '+$4.21', pos: true },
        ].map((t) => (
          <div key={t.title} className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-cream-warm dark:bg-night text-[15px] shrink-0">{t.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink dark:text-cream-warm truncate">{t.title}</div>
              <div className="text-[11px] muted">{t.sub}</div>
            </div>
            <div className={`font-mono text-[13px] font-semibold ${t.pos ? 'text-terracotta' : 'text-ink dark:text-cream-warm'}`}>{t.amt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
