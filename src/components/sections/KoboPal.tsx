import { Section, SectionHead, Reveal } from '@/components/ui/Section';

/**
 * Kobo Pal on the landing page (2026-10-24). Every claim maps to something Pal does today
 * (clickbot src/services/assistant.js): checks the user's recent activity when asked about a payment,
 * remembers meters / usual bank, hands off to a person, and Pal VIP (tips) reads balances, spending,
 * Earn options and Smart Picks. The chat below is illustrative.
 */
const CHAT: Array<{ me?: boolean; t: string }> = [
  { me: true, t: 'Did my GTBank withdrawal land?' },
  { t: 'Yes — ₦25,000 reached your GTBank account at 2:14 pm. The receipt is in Activity if you need to share it.' },
  { me: true, t: 'Pay my light bill, same meter as last time' },
  { t: 'Your AEDC prepaid meter ending 4417 — how much would you like to buy? Your token shows the moment it’s paid.' },
];

const POINTS = [
  { t: 'Knows your account', d: 'Ask about a payment and Pal checks your actual activity — what landed, what is pending, the reference.' },
  { t: 'Remembers for you', d: 'Your meter, your usual bank, your goals — so the next payment takes seconds.' },
  { t: 'A person when you need one', d: 'Tap “Talk to a person” and a member of the Kobocent team replies right in the chat. You get a notification.' },
  { t: 'Pal VIP', d: 'Tip Pal from any balance and it runs on a far more capable model: your spending by month, Earn options for idle money, Smart Picks explained with the risks.' },
];

export function KoboPal() {
  return (
    <Section id="kobo-pal">
      <SectionHead
        eyebrow="Meet Kobo Pal"
        title={<>Help that knows <span className="text-terracotta italic">your account</span></>}
        body="Kobo Pal is the assistant inside Kobocent, on the web and in Telegram. Ask in plain words — no menus to dig through, no ticket number to wait on."
      />

      <div className="mt-12 grid lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
        <Reveal>
          <div className="surface rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-cream-border dark:border-night-border">
              <span className="grid place-items-center h-10 w-10 rounded-full bg-terracotta text-white font-display font-bold">K</span>
              <div>
                <div className="font-semibold text-[15px] text-ink dark:text-cream-warm">Kobo Pal</div>
                <div className="text-[12px] muted">Usually replies in seconds</div>
              </div>
            </div>
            <div className="space-y-3">
              {CHAT.map((m, i) => (
                <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-[1.6] ${m.me
                    ? 'bg-terracotta text-white rounded-br-md'
                    : 'bg-cream-warm dark:bg-night text-ink dark:text-cream-warm rounded-bl-md'}`}>{m.t}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] muted text-center">Example conversation</p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4">
          {POINTS.map((p, i) => (
            <Reveal key={p.t} delay={i * 70}>
              <div className="surface rounded-2xl p-6 h-full">
                <h3 className="font-display text-[17px] font-bold text-ink dark:text-cream-warm mb-2">{p.t}</h3>
                <p className="text-[13.5px] leading-[1.7] muted">{p.d}</p>
              </div>
            </Reveal>
          ))}
          <p className="sm:col-span-2 text-[12.5px] muted leading-relaxed">
            Pal will never ask for your recovery phrase or a private key — nobody from Kobocent will. Signals and
            suggestions are information, not guarantees.
          </p>
        </div>
      </div>
    </Section>
  );
}
