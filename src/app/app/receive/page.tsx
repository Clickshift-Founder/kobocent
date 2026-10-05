import { redirect } from 'next/navigation';

// Receive now lives inside Add money (2026-10-05) — "money in" in one place. Old links keep working.
export default function ReceiveRedirect() {
  redirect('/app/add-money?tab=crypto');
}
