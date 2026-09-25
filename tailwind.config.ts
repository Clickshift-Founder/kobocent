import type { Config } from 'tailwindcss';

/**
 * Kobocent design tokens.
 * Single source of truth — mirrors the Brand Identity Guide.
 * Primary: terracotta. Secondary: deep ink. Light-first, dark optional.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: '#C1502E',
          dark: '#9A3E22',
          light: '#E8895F',
          soft: 'rgba(193,80,46,0.08)',
        },
        ink: {
          DEFAULT: '#20211F',
          soft: '#2A2A2A',
        },
        cream: {
          DEFAULT: '#F7F3EE',
          warm: '#F0E6D8',
          border: '#E4D8C6',
        },
        night: {
          DEFAULT: '#1C1815',
          card: '#242019',
          border: '#3A342C',
        },
        warmgray: {
          DEFAULT: '#6B5D52',
          light: '#8A7B6C',
          dark: '#A89A8C',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        soft: '0 2px 12px rgba(32,33,31,0.05)',
        card: '0 8px 30px rgba(32,33,31,0.08)',
        lift: '0 20px 50px rgba(32,33,31,0.12)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 60s linear infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [],
};
export default config;
