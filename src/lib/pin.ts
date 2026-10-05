// App PIN plumbing (sign-in v2, 2026-10-05). The backend answers a payment with 423 PIN_REQUIRED /
// PIN_SETUP when a PIN is needed; kc() asks the registered handler (the PIN pad in SecurityProvider)
// for a short-lived PIN token and retries the same request once with it.
export type PinCode = 'PIN_REQUIRED' | 'PIN_SETUP';
type Handler = (code: PinCode) => Promise<string | null>;
let handler: Handler | null = null;
export function setPinHandler(h: Handler | null) { handler = h; }
export async function requestPinToken(code: PinCode): Promise<string | null> { return handler ? handler(code) : null; }
