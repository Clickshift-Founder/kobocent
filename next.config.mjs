/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security fix A (2026-11-10): nothing uses next/image, so the image optimizer (/_next/image) is off. Next 14 is end of
  // life and its optimizer has unpatched remote-code-execution advisories (fixed only in 15.5.28+). Upgrade to Next 15 next.
  images: { unoptimized: true },
  async headers() {
    return [
      // Security fix B (2026-11-10): no other site may frame kobocent.com (click-hijacking of payment screens), browsers
      // must not guess file types, links out send only our origin, and the page can't ask for camera / mic / location.
      // The iOS / Android shell loads the site as its top page (capacitor server.url), not in a frame, so it is unaffected.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};
export default nextConfig;
