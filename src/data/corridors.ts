/**
 * Concrete "money movement" stories for the landing page.
 * These exist to make an abstract product instantly legible:
 * a visitor should see their own situation in at least one row.
 */
export interface Corridor {
  from: string;
  fromFlag: string;     // a country code (drawn by <Flag>) or an emoji
  action: string;
  to: string;
  toFlag: string;
  note: string;
  live: boolean;
}

export const CORRIDORS: Corridor[] = [
  { from: 'Naira', fromFlag: 'NG', action: 'buy USDC, then send', to: 'US Dollars', toFlag: 'US', note: 'Pay a supplier, a tuition fee, or family abroad.', live: true },
  { from: 'Naira', fromFlag: 'NG', action: 'buy USDC, then send', to: 'Japanese Yen', toFlag: 'JP', note: 'Settle an import invoice without a correspondent bank.', live: true },
  { from: 'USDC / USDT', fromFlag: '🪙', action: 'withdraw as', to: 'Naira in your bank', toFlag: '🏦', note: '200+ Nigerian banks, from any chain. Minutes, not days.', live: true },
  { from: 'ETH, BNB, POL, USDT', fromFlag: '⛓️', action: 'pay directly as', to: 'Electricity or airtime', toFlag: '💡', note: 'Crypto you already hold, on any of six chains, paying a real bill at home — no bridging first.', live: true },
  { from: 'Naira', fromFlag: 'NG', action: 'buy USDC, then send', to: 'British Pounds', toFlag: 'GB', note: 'Same rails, same speed.', live: false },
  { from: 'Naira', fromFlag: 'NG', action: 'buy USDC, then send', to: 'Kenyan Shillings', toFlag: 'KE', note: 'East Africa corridor opening next.', live: false },
];
