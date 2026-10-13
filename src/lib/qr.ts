/**
 * Wallet-address QR codes (2026-10-13) → the address to fill in. Wallets and exchanges encode addresses as:
 *  - the bare address (Solana base58, or 0x…)
 *  - Solana Pay: solana:<address>?amount=…&spl-token=…
 *  - EIP-681: ethereum:<address>@56?value=…, or a token transfer ethereum:<token>@56/transfer?address=<recipient>&uint256=…
 *    (for a token transfer the recipient is the `address` parameter, not the token contract)
 * Anything else → null, so a random QR (a website, a Wi-Fi code) never lands in an address box.
 */
export type AddressKind = 'solana' | 'evm' | 'any';
const SOL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM = /^0x[0-9a-fA-F]{40}$/;

export function addressFromQr(raw: string, kind: AddressKind = 'any'): string | null {
  let text = String(raw || '').trim();
  if (!text) return null;
  let candidate = text;
  const scheme = /^([a-z][a-z0-9+.-]*):(?:\/\/)?(.*)$/i.exec(text);
  if (scheme) {
    const name = scheme[1].toLowerCase();
    text = scheme[2];
    const [path, query = ''] = text.split('?');
    const params = new URLSearchParams(query);
    if (name === 'solana') candidate = path;
    else if (name === 'ethereum' || name === 'bnb' || name === 'binance' || name === 'bsc') {
      const target = path.replace(/^pay-/, '');
      candidate = /\/transfer$/i.test(target) && params.get('address') ? params.get('address')! : target.split(/[@/]/)[0];
    } else return null;
  }
  candidate = candidate.trim();
  const ok = (kind === 'solana' || kind === 'any') && SOL.test(candidate) ? true : (kind === 'evm' || kind === 'any') && EVM.test(candidate);
  return ok ? candidate : null;
}
