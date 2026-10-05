'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogoLockup, LogoMark } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { IconHome, IconActivity, IconCard, IconSettings, IconTelegram, IconLogout, IconTrophy } from './Icons';
import { initInstallCapture, registerServiceWorker } from '@/lib/pwa';
import { SecurityProvider } from './SecurityProvider';
import { BOT_URL, loadProfile, clearProfile, type LocalProfile } from '@/lib/kc';

const TABS = [
  { href: '/app', label: 'Home', Icon: IconHome },
  { href: '/app/activity', label: 'Activity', Icon: IconActivity },
  { href: '/app/rewards', label: 'Rewards', Icon: IconTrophy },
  { href: '/app/card', label: 'Card', Icon: IconCard },
  { href: '/app/settings', label: 'Settings', Icon: IconSettings },
];

export function Avatar({ profile, size = 36 }: { profile: LocalProfile | null; size?: number }) {
  const initial = (profile?.firstName || profile?.username || 'K').trim().charAt(0).toUpperCase();
  if (profile?.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.photoUrl} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="grid place-items-center rounded-full bg-terracotta text-white font-semibold" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </span>
  );
}

export async function signOut(router: ReturnType<typeof useRouter>) {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  clearProfile();
  router.replace('/'); // signing out is the only way back to the landing page
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  useEffect(() => {
    setProfile(loadProfile());
    initInstallCapture();      // Home's install card needs the browser's one-time prompt
    registerServiceWorker();
  }, []);

  const active = (href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href));

  return (
    <div className="min-h-[100dvh] lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-cream-border dark:border-night-border px-5 py-6 sticky top-0 h-screen">
        <Link href="/app" aria-label="Kobocent home" className="mb-10 px-2"><LogoLockup /></Link>
        <nav className="flex-1 space-y-1">
          {TABS.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors
                ${active(href) ? 'bg-terracotta-soft text-terracotta' : 'text-warmgray dark:text-warmgray-dark hover:bg-cream-warm dark:hover:bg-night-card hover:text-ink dark:hover:text-cream-warm'}`}>
              <Icon size={20} />{label}
            </Link>
          ))}
        </nav>
        <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
           className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] muted hover:text-terracotta">
          <IconTelegram />Open in Telegram
        </a>
        <div className="flex items-center justify-between gap-2 mt-3 pt-4 border-t border-cream-border dark:border-night-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar profile={profile} />
            <span className="truncate text-[14px] font-medium text-ink dark:text-cream-warm">{profile?.firstName || 'You'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle compact />
            <button onClick={() => signOut(router)} aria-label="Sign out" title="Sign out"
              className="grid place-items-center h-9 w-9 rounded-xl border border-cream-border dark:border-night-border text-warmgray hover:text-terracotta hover:border-terracotta">
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-cream/90 dark:bg-night/90 backdrop-blur-lg border-b border-cream-border dark:border-night-border"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/app" className="flex items-center gap-2" aria-label="Kobocent home">
              <LogoMark size={28} className="text-terracotta" />
              <span className="font-display font-bold text-[19px] text-ink dark:text-cream-warm">Kobocent</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <Link href="/app/settings" aria-label="Settings"><Avatar profile={profile} size={34} /></Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[880px] px-4 sm:px-6 lg:px-10 py-5 lg:py-10 pb-28 lg:pb-12">
          <SecurityProvider>{children}</SecurityProvider>
        </main>

        {/* Mobile bottom tabs — clear of the home indicator */}
        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-night-card/95 backdrop-blur-lg border-t border-cream-border dark:border-night-border"
             style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="App">
          <ul className="grid grid-cols-5">
            {TABS.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link href={href} aria-current={active(href) ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors
                    ${active(href) ? 'text-terracotta' : 'text-warmgray dark:text-warmgray-dark'}`}>
                  <Icon size={22} />{label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
