import Link from 'next/link';

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'clicksolbot';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta/[0.07] blur-3xl" />
      </div>
      <div className="container-page text-center">
        <h2 className="h-display text-[clamp(32px,5.2vw,58px)] max-w-3xl mx-auto mb-5">
          Money should move as easily as<br className="hidden sm:block" />
          <span className="text-terracotta italic"> a message does.</span>
        </h2>
        <p className="muted text-[16.5px] leading-[1.75] max-w-xl mx-auto mb-10">
          Start on Telegram or start on the web — it is the same account, the same balance,
          and it stays in sync whichever one you open next.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary">Create free account</Link>
          <a href={`https://t.me/${BOT}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            Continue in Telegram
          </a>
        </div>
        <p className="mt-6 text-[13px] muted">
          Free to start · No gas fees · Your keys, your money
        </p>
      </div>
    </section>
  );
}
