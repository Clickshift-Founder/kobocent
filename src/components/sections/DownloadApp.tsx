'use client';
import { useEffect, useState } from 'react';
import { Section, SectionHead } from '@/components/ui/Section';
import { isIOS, isStandalone, type BeforeInstallPromptEvent } from '@/lib/pwa';

export function DownloadApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIOS());
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (ios) { setShowIosHelp(true); return; }
    if (!deferred) { setShowIosHelp(true); return; }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <Section id="download">
      <div className="surface rounded-3xl p-8 sm:p-12 text-center">
        <SectionHead
          eyebrow="Install it"
          title={<>Put Kobocent <span className="text-terracotta italic">on your home screen</span></>}
          body="Installs straight from the browser — no app store, no waiting for a review. Works offline for the basics and opens like any other app on your phone."
        />

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {installed ? (
            <span className="btn bg-terracotta/10 text-terracotta border border-terracotta/30 cursor-default">
              ✓ Installed — open it from your home screen
            </span>
          ) : (
            <button onClick={install} className="btn-primary">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download app
            </button>
          )}

          <span className="btn border border-cream-border dark:border-night-border muted cursor-default">
             App Store — coming soon
          </span>
          <span className="btn border border-cream-border dark:border-night-border muted cursor-default">
            ▶ Google Play — coming soon
          </span>
        </div>

        {showIosHelp && (
          <div className="mt-7 mx-auto max-w-lg rounded-2xl border border-terracotta/25 bg-terracotta/[0.05] p-5 text-left">
            <p className="text-[13.5px] leading-[1.75] muted">
              {ios ? (
                <>
                  <strong className="text-terracotta">On iPhone:</strong> tap the Share button in Safari,
                  scroll down, then choose <strong>Add to Home Screen</strong>. Kobocent will open like a
                  normal app.
                </>
              ) : (
                <>
                  <strong className="text-terracotta">Almost there:</strong> your browser did not offer the
                  install prompt. Open the browser menu and look for{' '}
                  <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
