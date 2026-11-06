/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Metal Mania', 'sans-serif'],
        serif: ['Cinzel', 'serif'],
        gothic: ['Metal Mania', 'sans-serif'],
      },
      colors: {
        dark: {
          DEFAULT: '#070708',
          deep: '#030304',
          surface: '#121215',
        },
        charcoal: {
          DEFAULT: '#131316',
          light: '#1c1c22',
          border: '#2a2a34',
        },
        bone: {
          DEFAULT: '#eae5d9',
          light: '#f5f2eb',
          muted: '#9e998c',
          dark: '#545148',
        },
        // Keep the legacy utility name so existing components inherit the temple-gold accent.
        crimson: {
          DEFAULT: '#D4AF37',
          light: '#F6E19A',
          dark: '#8C6B1F',
          glow: 'rgba(212, 175, 55, 0.42)',
        },
        ink: {
          DEFAULT: '#070708',
          soft: '#131316',
        },
        paper: {
          DEFAULT: '#131316',
          warm: '#eae5d9',
        },
        clay: '#D4AF37',
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quint': 'cubic-bezier(0.83, 0, 0.17, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'ken-burns': {
          '0%': { transform: 'scale(1.06) translateY(0)' },
          '100%': { transform: 'scale(1.16) translateY(-1.5%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        'loader-line': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee: 'marquee 32s linear infinite',
        'ken-burns': 'ken-burns 22s ease-out both',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'loader-line': 'loader-line 1.1s cubic-bezier(0.83, 0, 0.17, 1) forwards',
      },
    },
  },
  plugins: [],
};
