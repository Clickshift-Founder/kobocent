/** Line icons for the app (24px grid, currentColor). */
type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const IconHome = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>);
export const IconActivity = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M4 6h16M4 12h10M4 18h7" /></svg>);
export const IconReceive = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" /></svg>);
export const IconSend = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M12 20V8m0 0-5 5m5-5 5 5M5 4h14" /></svg>);
export const IconSettings = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>);
export const IconBolt = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>);
export const IconBank = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 5H3z" /></svg>);
export const IconPlus = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>);
export const IconLeaf = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19c3-3 6-5 9-6" /></svg>);
export const IconBridge = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M4 7h11l-3-3m3 3-3 3M20 17H9l3 3m-3-3 3-3" /></svg>);
export const IconChart = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M4 19V5m0 14h16M8 15l3-4 3 3 5-7" /></svg>);
export const IconCopy = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>);
export const IconCheck = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><path d="m5 12 5 5 9-10" /></svg>);
export const IconChevron = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><path d="m9 6 6 6-6 6" /></svg>);
export const IconDownload = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>);
export const IconShield = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></svg>);
export const IconGift = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M4 11h16v10H4zM2 7h20v4H2zM12 7v14M12 7c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z" /></svg>);
export const IconTelegram = ({ size = 18, className }: P) => (<svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1l-4.8-1.5c-1-.3-1-1 .2-1.5l18.9-7.3c.9-.3 1.6.2 1.4 1.5z" /></svg>);
export const IconEye = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>);
export const IconLogout = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" /></svg>);
export const IconTrophy = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>);
export const IconWallet = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01" /></svg>);
export const IconSwap = ({ size = 22, className }: P) => (<svg {...base(size)} className={className}><path d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" /></svg>);
export const IconClose = ({ size = 18, className }: P) => (<svg {...base(size)} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>);
