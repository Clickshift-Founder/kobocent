'use client';
import { ErrorNote } from '@/components/app/ErrorNote';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kc, loadProfile, saveProfile, referralLink, BOT, BOT_URL, type Account, type LocalProfile } from '@/lib/kc';
import { Avatar, signOut } from '@/components/app/AppShell';
import { CopyButton, Sheet } from '@/components/app/ui';
import { TelegramLogin, type TelegramUser } from '@/components/app/TelegramLogin';
import { IconShield, IconTelegram, IconLogout, IconChevron, IconEye, IconGift, IconBell, IconFace } from '@/components/app/Icons';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PageHeader } from '@/components/app/PageHeader';
import { SecuritySettings } from '@/components/app/SecuritySettings';
import { protect, type Protection } from '@/components/app/AccountProtection';
import { PushSettings } from '@/components/app/PushSettings';
import { DeleteAccount } from '@/components/app/DeleteAccount';
import { TIPS } from '@/lib/guide';
import { GoogleButton, googleEnabled } from '@/components/app/GoogleButton';

/**
 * Settings (rebuilt 2026-11-04, founder: easy navigation, mobile first). One short menu in groups; each row opens its own screen, and
 * the phone's back button returns to the menu. Deep links are hashes: #security, #lock, #telegram, #notifications, #invite, #guide,
 * #profile. Freezing stays one tap from the menu, because someone who has just lost a phone should not have to hunt for it.
 */
type View = 'menu' | 'profile' | 'security' | 'lock' | 'telegram' | 'notifications' | 'invite' | 'guide';
const VIEWS: View[] = ['profile', 'security', 'lock', 'telegram', 'notifications', 'invite', 'guide'];
const TITLE: Record<Exclude<View, 'menu'>, string> = { profile: 'Your profile', security: 'Account protection', lock: 'App lock & sign-in', telegram: 'Telegram', notifications: 'Notifications', invite: 'Invite friends', guide: 'Product guide' };
const viewFromHash = (): View => { const h = window.location.hash.slice(1) as View; return VIEWS.includes(h) ? h : 'menu'; };
interface SecuritySummary { hasPin: boolean; protection?: Protection | null }

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="eyebrow mb-2 px-1">{title}</div>
      <div className="surface rounded-3xl divide-y divide-cream-border dark:divide-night-border overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ icon, title, note, tone, onClick, href }: { icon: ReactNode; title: string; note?: string; tone?: 'danger'; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-xl text-[18px] ${tone === 'danger' ? 'bg-[#B84A40]/10 text-[#B84A40]' : 'bg-terracotta-soft text-terracotta'}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block font-medium ${tone === 'danger' ? 'text-[#B84A40]' : 'text-ink dark:text-cream-warm'}`}>{title}</span>
        {note && <span className="block text-[13px] muted truncate">{note}</span>}
      </span>
      <IconChevron className="muted shrink-0" />
    </>
  );
  const cls = 'w-full flex items-center gap-3.5 px-4 py-3 text-left min-h-[64px] active:bg-cream-warm dark:active:bg-night';
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('menu');
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [sec, setSec] = useState<SecuritySummary | null>(null);
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [linkErr, setLinkErr] = useState('');
  const [phraseOpen, setPhraseOpen] = useState(false);
  const [guideNote, setGuideNote] = useState('');
  const fromMenu = useRef(false);

  const loadSec = useCallback(() => { kc<SecuritySummary>('security').then(setSec).catch(() => {}); }, []);
  useEffect(() => {
    setProfile(loadProfile());
    kc<{ account: Account }>('me').then(r => setAccount(r.account)).catch(() => {});
    loadSec();
    window.addEventListener('kc-security-changed', loadSec);
    return () => window.removeEventListener('kc-security-changed', loadSec);
  }, [loadSec]);

  // The view lives in the hash, so links land on it and the phone's back button leaves it.
  useEffect(() => {
    const sync = () => { setView(viewFromHash()); window.scrollTo(0, 0); };
    setView(viewFromHash());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);
  function open(v: View) {
    fromMenu.current = true;
    window.history.pushState(window.history.state, '', `#${v}`);
    setView(v); window.scrollTo(0, 0);
  }
  function back() {
    if (fromMenu.current) { fromMenu.current = false; window.history.back(); return; }
    window.history.replaceState(window.history.state, '', window.location.pathname);
    setView('menu'); window.scrollTo(0, 0);
  }

  async function makeLinkCode() {
    setLinkErr('');
    try { setLinkCode(await kc<{ code: string; expiresAt: number }>('link/telegram-code', { method: 'POST' })); }
    catch (e) { setLinkErr(e instanceof Error ? e.message : 'Could not create a code'); }
  }

  const ref = referralLink(profile?.telegramId);
  const name = profile?.firstName || account?.displayName?.split(' ')[0] || null;
  const frozen = !!sec?.protection?.frozen;
  const twoSignIns = !!account?.telegramLinked && !!account?.googleLinked;
  const score = sec ? [sec.hasPin, !!sec.protection?.hasQuestions, twoSignIns].filter(Boolean).length : null;

  if (view !== 'menu') return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={back} aria-label="Back to Settings" className="shrink-0 grid place-items-center h-11 w-11 -ml-1.5 rounded-xl text-ink dark:text-cream-warm">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="h-display text-[24px] sm:text-[30px] leading-tight min-w-0 truncate">{TITLE[view]}</h1>
      </div>
      <div className="space-y-6 animate-fade-up">
        {view === 'profile' && <ProfileView profile={profile} account={account} onSaved={(a, first) => { setAccount(a); const p = { firstName: first, username: profile?.username || null, photoUrl: profile?.photoUrl || null, telegramId: profile?.telegramId || null }; saveProfile(p); setProfile(p); }} />}
        {view === 'security' && <SecuritySettings account={account} onAccount={setAccount} part="protection" />}
        {view === 'lock' && <SecuritySettings account={account} onAccount={setAccount} part="lock" />}
        {view === 'notifications' && <PushSettings />}
        {view === 'telegram' && (
          <section id="telegram" className="surface rounded-3xl p-5 space-y-4">
            {account && !account.telegramLinked ? (
              <>
                <p className="text-[14.5px] text-ink dark:text-cream-warm">Connect Telegram so you never lose access to your wallet, and earn referral bonuses and $SHIFT points, with @{BOT} on the go.</p>
                {linkCode ? (
                  <div className="rounded-2xl bg-cream dark:bg-night p-4 text-center">
                    <div className="font-mono text-[28px] tracking-[0.2em] font-semibold text-ink dark:text-cream-warm">{linkCode.code}</div>
                    <p className="text-[13.5px] muted mt-2">Send <span className="font-mono">/link {linkCode.code}</span> to @{BOT} within 10 minutes. It works once.</p>
                  </div>
                ) : (
                  <button onClick={makeLinkCode} className="btn-primary w-full">Get a link code</button>
                )}
                <ErrorNote msg={linkErr} className="text-[13.5px] text-[#B84A40]" />
              </>
            ) : (
              <p className="text-[14.5px] muted">Your Telegram is connected: @{BOT} and this app share one wallet, balance and history.</p>
            )}
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full"><IconTelegram />Open @{BOT}</a>
          </section>
        )}
        {view === 'invite' && (
          <section className="surface rounded-3xl p-5 space-y-3">
            {ref ? (
              <>
                <div className="flex items-center gap-3"><IconGift className="text-terracotta" /><span className="font-medium text-ink dark:text-cream-warm">Earn 20% of your friends&apos; fees</span></div>
                <div className="rounded-2xl bg-cream dark:bg-night px-4 py-3 font-mono text-[13.5px] break-all">{ref}</div>
                <CopyButton value={ref} label="Copy my link" />
              </>
            ) : <p className="text-[14.5px] muted">Connect Telegram to get your invite link.</p>}
          </section>
        )}
        {view === 'guide' && (
          <section id="guide" className="surface rounded-3xl divide-y divide-cream-border dark:divide-night-border overflow-hidden">
            <button onClick={() => window.dispatchEvent(new Event('kc-guide-replay'))} className="w-full flex items-center gap-3.5 px-4 py-3 text-left min-h-[64px]">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-[18px]">🧭</span>
              <span className="flex-1"><span className="block font-medium text-ink dark:text-cream-warm">Replay the app tour</span><span className="block text-[13px] muted">A one-minute walk through everything Kobocent does.</span></span>
              <IconChevron className="muted" />
            </button>
            <button onClick={() => { window.dispatchEvent(new Event('kc-guide-reset')); setGuideNote('Tips will show again the next time you open each feature.'); }} className="w-full flex items-center gap-3.5 px-4 py-3 text-left min-h-[64px]">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-terracotta-soft text-[18px]">💡</span>
              <span className="flex-1"><span className="block font-medium text-ink dark:text-cream-warm">Show feature tips again</span><span className="block text-[13px] muted">{guideNote || 'The short explainer you see the first time you open a feature.'}</span></span>
            </button>
            <div className="p-4">
              <div className="text-[13px] muted mb-2">Or read a guide now:</div>
              <div className="flex flex-wrap gap-2">
                {TIPS.map(t => (
                  <button key={t.key} onClick={() => window.dispatchEvent(new CustomEvent('kc-guide-tip', { detail: t.key }))} className="rounded-full border border-cream-border dark:border-night-border px-3 min-h-[44px] text-[13.5px]">{t.title}</button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" />

      <button onClick={() => open('profile')} className="w-full surface rounded-3xl p-4 flex items-center gap-4 text-left min-h-[76px]">
        <Avatar profile={profile} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[17px] text-ink dark:text-cream-warm truncate">{name || 'Add your name'}</span>
          <span className="block muted text-[14px] truncate">{profile?.username ? `@${profile.username}` : account?.email || (account?.telegramLinked ? 'Signed in with Telegram' : 'Your profile')}</span>
        </span>
        <IconChevron className="muted shrink-0" />
      </button>

      <Group title="Security">
        <Row icon={<IconShield size={20} />} title="Account protection"
          note={frozen ? 'Frozen: no money can leave' : score === null ? 'Questions, freeze, new wallet' : score === 3 ? 'Fully protected' : `${score} of 3 protections on`} onClick={() => open('security')} />
        <Row icon={<IconFace size={20} />} title="App lock & sign-in" note="PIN, auto-lock and ways to sign in" onClick={() => open('lock')} />
        <Row icon={<IconEye size={20} />} title="Recovery phrase" note="Back up your wallet" onClick={() => setPhraseOpen(true)} />
        {frozen
          ? <Row icon={<span aria-hidden>🔓</span>} title="Unfreeze my account" onClick={() => protect('unfreeze')} />
          : <Row icon={<span aria-hidden>🧊</span>} title="Freeze my account" note="Stops all money leaving" tone="danger" onClick={() => protect('freeze')} />}
      </Group>

      <Group title="Connections">
        <Row icon={<IconTelegram size={20} />} title="Telegram" note={account?.telegramLinked ? 'Connected' : 'Not connected'} onClick={() => open('telegram')} />
        <Row icon={<IconGift size={20} />} title="Invite friends" note="Earn 20% of their fees" onClick={() => open('invite')} />
      </Group>

      <Group title="Preferences">
        <Row icon={<IconBell size={20} />} title="Notifications" note="Money in, payments and bridges" onClick={() => open('notifications')} />
        <div className="flex items-center gap-3.5 px-4 py-3 min-h-[64px]">
          <span aria-hidden className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-terracotta-soft text-[18px]">🌙</span>
          <span className="flex-1 font-medium text-ink dark:text-cream-warm">Dark mode</span>
          <ThemeToggle />
        </div>
      </Group>

      <Group title="Help">
        <Row icon={<span aria-hidden>🧭</span>} title="Product guide" note="The tour and how each feature works" onClick={() => open('guide')} />
        <Row icon={<span aria-hidden>💬</span>} title="Contact support" href="/support" />
      </Group>

      <p className="text-[13px] muted leading-relaxed px-1">Your keys are encrypted, and only you can trigger a transaction. Kobocent will never message you first asking for money, your phrase or a code. The only official links are kobocent.com and t.me/{BOT}.</p>

      <div className="surface rounded-3xl overflow-hidden">
        <button onClick={() => signOut(router)} className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#B84A40] font-medium min-h-[60px]"><IconLogout />Sign out</button>
      </div>
      <DeleteAccount />

      <RecoveryPhraseSheet open={phraseOpen} onClose={() => setPhraseOpen(false)} />
    </div>
  );
}

function ProfileView({ profile, account, onSaved }: { profile: LocalProfile | null; account: Account | null; onSaved: (a: Account, first: string) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { setName(n => n || account?.displayName || profile?.firstName || ''); }, [account, profile]);
  async function save() {
    setBusy(true); setErr(''); setNote('');
    try {
      const r = await kc<{ account: Account }>('account/name', { method: 'POST', body: { name } });
      onSaved(r.account, name.trim().split(/\s+/)[0]);
      setNote('Saved');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save your name'); }
    finally { setBusy(false); }
  }
  return (
    <section className="surface rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        <Avatar profile={profile} size={56} />
        <div className="min-w-0 muted text-[14px] truncate">{profile?.username ? `@${profile.username}` : account?.email || ''}</div>
      </div>
      <label className="block">
        <span className="block text-[13.5px] muted mb-1.5">What should we call you?</span>
        <input value={name} onChange={e => { setName(e.target.value); setNote(''); }} maxLength={40} autoComplete="given-name" placeholder="Your name"
          className="w-full rounded-2xl border border-cream-border dark:border-night-border bg-transparent px-4 min-h-[48px] text-[16px]" />
      </label>
      <ErrorNote msg={err} className="text-[13.5px] text-[#B84A40]" />
      {note && <p className="text-[13.5px] text-[#58834C]">{note}</p>}
      <button onClick={save} disabled={busy || !name.trim()} className="btn-primary w-full disabled:opacity-50">Save</button>
    </section>
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

  // Telegram or Google confirmation (sign-in v2) → 5-minute re-auth token → the phrase, once.
  const onAuth = (user: TelegramUser) => reveal(user);
  async function reveal(body: unknown) {
    setBusy(true); setError('');
    try {
      const { reauthToken } = await kc<{ reauthToken: string }>('auth/reauth', { method: 'POST', body });
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
          <p className="text-[14px] muted">Confirm it is you with Telegram or Google. If Telegram is connected, we also send you an alert when the phrase is shown.</p>
          <div className={busy ? 'opacity-50 pointer-events-none' : ''}>
            <TelegramLogin onAuth={onAuth} />
            {googleEnabled() && <div className="mt-3"><GoogleButton onCredential={(credential) => reveal({ credential })} /></div>}
          </div>
          <ErrorNote msg={error} className="text-[13.5px] text-[#B84A40]" />
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
