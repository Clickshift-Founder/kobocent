import { Section, SectionHead, Reveal } from '@/components/ui/Section';

/**
 * Security on the landing page (founder, 2026-11-04). Every claim maps to something built:
 * clickbot src/services/accountSecurity.js, src/utils/spendGuard.js, src/telegram/protection.js.
 */
const POINTS = [
  { icon: '🧊', t: 'Freeze in one tap', d: 'Lost your phone? Freeze from the app, the lock screen, Telegram or Kobo Pal. Every outgoing move stops on every device, at the wallet key itself.' },
  { icon: '🔑', t: 'Questions only you can answer', d: 'Pick three security questions. They unfreeze your account and reset your PIN. Answers are scrambled before we store them, so nobody at Kobocent can read them.' },
  { icon: '🔢', t: 'A PIN that gets stricter', d: 'Your PIN or Face ID guards the app and every payment. Too many wrong tries and even the right PIN waits for your security answers.' },
  { icon: '🕑', t: 'A safe 24 hours after', d: 'For a day after an unfreeze, money can only go to banks and wallets you have paid before. A thief’s new account gets nothing.' },
  { icon: '🛟', t: 'Stop losses still protect you', d: 'While frozen, money can still come in, and your stop loss and take profit keep watching your holdings.' },
  { icon: '🙋', t: 'A real person when it matters', d: 'Forgot your answers? Someone on our team checks details a thief could not guess, and every step is written down.' },
];

export function Security() {
  return (
    <Section id="security" tone="warm">
      <SectionHead
        eyebrow="Security"
        title={<>If your phone goes missing, <span className="text-terracotta italic">your money doesn’t</span></>}
        body="Your keys are encrypted, and only you can trigger a transaction. And when something goes wrong, you can stop everything in one tap."
      />
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POINTS.map((p, i) => (
          <Reveal key={p.t} delay={i * 70}>
            <div className="surface rounded-2xl p-6 h-full">
              <div className="text-[26px] mb-3" aria-hidden>{p.icon}</div>
              <h3 className="font-display text-[17px] font-bold text-ink dark:text-cream-warm mb-2">{p.t}</h3>
              <p className="text-[13.5px] leading-[1.7] muted">{p.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-center text-[12.5px] muted max-w-2xl mx-auto leading-relaxed">
        A freeze stops every move made through Kobocent. Keep your recovery phrase private: anyone who has it can use it outside Kobocent.
      </p>
    </Section>
  );
}
