/**
 * Concrete "money movement" stories for the landing page.
 * These exist to make an abstract product instantly legible:
 * a visitor should see their own situation in at least one row.
 */
export interface Corridor {
  from: string;
  fromFlag: string;
  action: string;
  to: string;
  toFlag: string;
  note: string;
  live: boolean;
}

export const CORRIDORS: Corridor[] = [
  { from: 'Naira', fromFlag: '🇳🇬', action: 'buy USDC, then send', to: 'US Dollars', toFlag: '🇺🇸', note: 'Pay a supplier, a tuition fee, or family abroad.', live: true },
  { from: 'Naira', fromFlag: '🇳🇬', action: 'buy USDC, then send', to: 'Japanese Yen', toFlag: '🇯🇵', note: 'Settle an import invoice without a correspondent bank.', live: true },
  { from: 'USDC / USDT', fromFlag: '🪙', action: 'withdraw as', to: 'Naira in your bank', toFlag: '🏦', note: '200+ Nigerian banks. Minutes, not days.', live: true },
  { from: 'ETH, BNB, MATIC', fromFlag: '⛓️', action: 'bridge, then spend as', to: 'Electricity or airtime', toFlag: '💡', note: 'Crypto you already hold, paying a real bill at home.', live: true },
  { from: 'Naira', fromFlag: '🇳🇬', action: 'buy USDC, then send', to: 'British Pounds', toFlag: '🇬🇧', note: 'Same rails, same speed.', live: false },
  { from: 'Naira', fromFlag: '🇳🇬', action: 'buy USDC, then send', to: 'Kenyan Shillings', toFlag: '🇰🇪', note: 'East Africa corridor opening next.', live: false },
];
