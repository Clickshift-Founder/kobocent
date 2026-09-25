/**
 * NOTE: replace `photo` with a real image path in /public/images/people/
 * once you have consented photos. Falls back to an initial avatar.
 */
export interface Testimonial {
  quote: string;
  name: string;
  location: string;
  flag: string;
  vertical: string;
  photo?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  { quote: 'I paid my electricity bill by just typing it in the chat. The token came in seconds. I did not believe crypto could feel this normal until I tried it.', name: 'Amara N.', location: 'Abuja, Nigeria', flag: '🇳🇬', vertical: 'Bill payments' },
  { quote: 'Sold a token, hit withdraw, and the Naira was in my GTBank account before I finished making coffee. No P2P stress.', name: 'Kwame A.', location: 'Accra, Ghana', flag: '🇬🇭', vertical: 'Bank withdrawal' },
  { quote: 'My stablecoins used to just sit there. Now they earn while I wait for setups. The hourly earnings view is oddly satisfying to check.', name: 'Sipho M.', location: 'Johannesburg, South Africa', flag: '🇿🇦', vertical: 'Staking' },
  { quote: 'I had USDT stuck on BNB Chain with no easy way to spend it here. Bridged it in, withdrew to my bank the same day. Solved a real problem.', name: 'David M.', location: 'Nairobi, Kenya', flag: '🇰🇪', vertical: 'Multichain' },
  { quote: 'The risk score saved me from a rug. It flagged holder concentration I completely missed. I check every token through it now.', name: 'Ravi P.', location: 'Mumbai, India', flag: '🇮🇳', vertical: 'Trading' },
  { quote: 'The trailing exit caught the top of a run I would definitely have sold too early. It exited at the peak while I was asleep.', name: 'Chidi O.', location: 'Lagos, Nigeria', flag: '🇳🇬', vertical: 'Trading' },
];
