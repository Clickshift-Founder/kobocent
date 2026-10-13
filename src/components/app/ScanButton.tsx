'use client';
import { useEffect, useState } from 'react';
import { scanAvailable, scanQr } from '@/lib/native';
import { addressFromQr, type AddressKind } from '@/lib/qr';
import { IconScan } from './Icons';

/**
 * "Scan" next to a wallet-address box (2026-10-13). Only inside the iOS / Android apps (native camera scanner); in a
 * browser it renders nothing. A QR that holds no address of the expected kind shows a short note here and fills nothing.
 * Keep it outside a <label> — a button inside one becomes the label's control.
 */
export function ScanButton({ kind = 'any', onAddress, className = '' }: { kind?: AddressKind; onAddress: (address: string) => void; className?: string }) {
  const [show, setShow] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { setShow(scanAvailable()); }, []);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(''), 4000); return () => clearTimeout(t); }, [note]);
  if (!show) return null;
  const what = kind === 'solana' ? 'Solana address' : kind === 'evm' ? '0x address' : 'wallet address';
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <button type="button" aria-label={`Scan a ${what} QR code`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-terracotta min-h-[44px] px-2"
        onClick={async () => {
          setNote('');
          const text = await scanQr(`Point the camera at a ${what} QR code`);
          if (!text) return;   // cancelled
          const a = addressFromQr(text, kind);
          if (a) onAddress(a); else setNote(`That QR code doesn’t hold a ${what}`);
        }}>
        <IconScan size={18} />Scan
      </button>
      {note && <span role="alert" className="absolute right-0 top-full z-10 w-56 rounded-xl bg-ink text-cream text-[12.5px] leading-snug px-3 py-2 shadow-lg">{note}</span>}
    </span>
  );
}
