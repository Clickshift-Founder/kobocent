import { ImageResponse } from 'next/og';
import { getPost } from '@/lib/blog';

// The picture shown when an article is shared on WhatsApp, X, LinkedIn or Telegram. Kobocent palette, light treatment.
export const alt = 'Kobocent blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  const title = post?.title ?? 'The Kobocent blog';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#F7F3EE', padding: '64px 72px', color: '#20211F' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 120 120">
            <g transform="translate(60,60)">
              <circle cx="-14" cy="0" r="30" fill="none" stroke="#C1502E" strokeWidth="9" />
              <circle cx="26" cy="0" r="20" fill="#C1502E" />
              <circle cx="26" cy="0" r="6.5" fill="#F7F3EE" />
            </g>
          </svg>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>
            <span>Kobo</span>
            <span style={{ color: '#C1502E' }}>cent</span>
          </div>
          <div style={{ display: 'flex', marginLeft: 16, fontSize: 26, color: '#6B5D52' }}>Blog</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {post?.category && <div style={{ display: 'flex', fontSize: 26, color: '#C1502E', textTransform: 'uppercase', letterSpacing: 3 }}>{post.category}</div>}
          <div style={{ display: 'flex', fontSize: title.length > 60 ? 58 : 70, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#6B5D52', borderTop: '2px solid #E4D8C6', paddingTop: 24 }}>
          <span>Multichain, powered by stablecoins.</span>
          <span>kobocent.com</span>
        </div>
      </div>
    ),
    size,
  );
}
