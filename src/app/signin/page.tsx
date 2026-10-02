import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthPanel } from '@/components/app/AuthPanel';

export const metadata: Metadata = { title: 'Sign in — Kobocent' };

export default function SignInPage() {
  return (
    <Suspense>
      <AuthPanel mode="signin" />
    </Suspense>
  );
}
