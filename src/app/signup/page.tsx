import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthPanel } from '@/components/app/AuthPanel';

// Was a waitlist form while the web app was in build (2026-10-02: replaced by real sign-up).
// The /api/waitlist route is kept for phone capture once phone sign-in is wired.
export const metadata: Metadata = { title: 'Create your account — Kobocent' };

export default function SignUpPage() {
  return (
    <Suspense>
      <AuthPanel mode="signup" />
    </Suspense>
  );
}
