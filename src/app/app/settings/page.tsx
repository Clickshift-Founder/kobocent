'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { kc, loadProfile, referralLink, BOT, BOT_URL, type Account, type LocalProfile } from '@/lib/kc';
import { Avatar, signOut } from '@/components/app/AppShell';
import { CopyButton, Sheet } from '@/components/app/ui';
import { TelegramLogin, type TelegramUser } from '@/components/app/TelegramLogin';
import { IconShield, IconTelegram, IconLogout, IconChevron, IconEye, IconGift } from '@/components/app/Icons';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [linkErr, setLinkErr] = useState('');
  const [phraseOpen, setPhraseOpen] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    kc<{ account: Account }>('me').then(r => setAccount(r.account)).catch(() => {});
  }, []);

  async function makeLinkCode() {
    setLinkErr('');
    try { setLinkCode(await kc<{ code: string; expiresAt: number }>('link/telegram-code', { method: 'POST' })); }
    catch (e) { setLinkErr(e instanceof Error ? e.message : 'Could not create a code'); }
  }

  const ref = referralLink(profile?.telegramId);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="h-display text-[28px] sm:text-[32px]">Settings</h1>

      <section className="surface rounded-3xl p-5 flex items-center gap-4">
        <Avatar profile={profile} size={52} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[17px] text-ink dark:text-cream-warm truncate">{profile?.firstName || 'Your account'}</div>
          <div className="muted text-[14px] truncate">{profile?.username ? `@${profile.username}` : 'Signed in with Telegram'}</div>
        </div>
        {account?.telegramLinked && <span className="rounded-full bg-[#58834C]/10 text-[#58834C] px-3 py-1 text-[12.5px] font-semibold">Telegram linked</span>}
      </section>

      {/* Security */}
      <section>
        <div className="eyebrow mb-2">Security</div>
        <div className="surface rounded-3xl divide-y divide-cream-border dark:divide-night-border">
          <button onClick={() => setPhraseOpen(true)} className="w-full flex items-center gap-4 p-5 text-left min-h-[64px]">
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-terracotta"><IconEye size={20} /></span>
            <span className="flex-1">
              <span className="block font-medium text-ink dark:text-cream-warm">Show recovery phrase</span>
              <span className="block text-[13.5px] muted">Back up your wallet. Needs a fresh Telegram confirmation.</span>
            </span>
            <IconChevron className="muted" />
          </button>
          <div className="flex items-start gap-4 p-5">
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-cream-warm dark:bg-night text-terracotta shrink-0"><IconShield size={20} /></span>
            <p className="text-[13.5px] muted leading-relaxed">Your keys are encrypted, and only you can trigger a transaction. Kobocent will never message you first asking for money, your phrase or a code. The only official links are kobocent.com and t.me/{BOT}.</p>
          </div>
        </div>
      </section>

      {/* Telegram */}
      <section>
        <div className="eyebrow mb-2">Telegram</div>
        <div className="surface rounded-3xl p-5 space-y-4">
          {account && !account.telegramLinked ? (
            <>
              <p className="text-[14.5px] text-ink dark:text-cream-warm">Link Telegram to use the same wallet in @{BOT} and earn $SHIFT points and referral commission.</p>
              {linkCode ? (
                <div className="rounded-2xl bg-cream dark:bg-night p-4 text-center">
                  <div className="font-mono text-[28px] tracking-[0.2em] font-semibold text-ink dark:text-cream-warm">{linkCode.code}</div>
                  <p className="text-[13.5px] muted mt-2">Send <span className="font-mono">/link {linkCode.code}</span> to @{BOT} within 10 minutes. It works once.</p>
                </div>
              ) : (
                <button onClick={makeLinkCode} className="btn-primary w-full">Get a link code</button>
              )}
              {linkErr && <p className="text-[13.5px] text-[#B84A40]">{linkErr}</p>}
            </>
          ) : (
            <p className="text-[14.5px] muted">Your Telegram is connected — @{BOT} and this app share one wallet, balance and history.</p>
          )}
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full"><IconTelegram />Open @{BOT}</a>
        </div>
      </section>

      {ref && (
        <section>
          <div className="eyebrow mb-2">Referrals</div>
          <div className="surface rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-3"><IconGift className="text-terracotta" /><span className="font-medium text-ink dark:text-cream-warm">Earn 20% of your friends&apos; fees</span></div>
            <div className="rounded-2xl bg-cream dark:bg-night px-4 py-3 font-mono text-[13.5px] break-all">{ref}</div>
            <CopyButton value={ref} label="Copy my link" />
          </div>
        </section>
      )}

      <section>
        <div className="eyebrow mb-2">Preferences</div>
        <div className="surface rounded-3xl divide-y divide-cream-border dark:divide-night-border">
          <div className="flex items-center justify-between p-5 min-h-[64px]">
            <span className="font-medium text-ink dark:text-cream-warm">Dark mode</span>
            <ThemeToggle />
          </div>
          <button onClick={() => signOut(router)} className="w-full flex items-center gap-3 p-5 text-left text-[#B84A40] font-medium min-h-[64px]">
            <IconLogout />Sign out
          </button>
        </div>
      </section>

      <RecoveryPhraseSheet open={phraseOpen} onClose={() => setPhraseOpen(false)} />
    </div>
  );
}

/** Warning → fresh Telegram login → reauth token → phrase, shown once and cleared on close. */
function RecoveryPhraseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'warn' | 'confirm' | 'show'>('warn');
  const [phrase, setPhrase] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function close() {
    setPhrase([]); setStep('warn'); setError(''); setBusy(false);
    onClose();
  }

  async function onAuth(user: TelegramUser) {
    setBusy(true); setError('');
    try {
      const { reauthToken } = await kc<{ reauthToken: string }>('auth/reauth', { method: 'POST', body: user });
      const r = await kc<{ phrase: string }>('wallet/recovery-phrase', { headers: { 'X-Reauth-Token': reauthToken } });
      setPhrase(r.phrase.split(/\s+/));
      setStep('show');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not show your phrase');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Recovery phrase">
      {step === 'warn' && (
        <div className="space-y-4">
          <ul className="space-y-2 text-[14px] muted leading-relaxed list-disc pl-5">
            <li>Anyone with these words controls your wallet. Kobocent will never ask for them.</li>
            <li>Write them on paper and keep them offline. Avoid screenshots.</li>
            <li>Make sure nobody can see your screen.</li>
          </ul>
          <button onClick={() => setStep('confirm')} className="btn-primary w-full">I understand — continue</button>
        </div>
      )}
      {step === 'confirm' && (
        <div className="space-y-4">
          <p className="text-[14px] muted">Confirm it is you with Telegram. We will also send you a Telegram alert when the phrase is shown.</p>
          <div className={busy ? 'opacity-50 pointer-events-none' : ''}><TelegramLogin onAuth={onAuth} /></div>
          {error && <p role="alert" className="text-[13.5px] text-[#B84A40]">{error}</p>}
        </div>
      )}
      {step === 'show' && (
        <div className="space-y-4">
          <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {phrase.map((w, n) => (
              <li key={n} className="rounded-xl bg-cream dark:bg-night px-3 py-2.5 font-mono text-[14px] text-ink dark:text-cream-warm">
                <span className="muted mr-1.5">{n + 1}.</span>{w}
              </li>
            ))}
          </ol>
          <button onClick={close} className="btn-primary w-full">I have written it down</button>
        </div>
      )}
    </Sheet>
  );
}
