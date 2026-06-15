/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        surface: {
          50: '#f8f9fb',
          100: '#f1f3f7',
          200: '#e4e8f0',
          800: '#1a1d27',
          900: '#13151f',
          950: '#0d0f18',
        },
        brand: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        accent: {
          400: '#34d399',
          500: '#10b981',
        },
        warn: {
          400: '#fbbf24',
        },
        danger: {
          400: '#f87171',
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-left': {
          '0%':   { opacity: '0', transform: 'translateX(-22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(22px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(248,113,113,0)' },
          '50%':       { boxShadow: '0 0 48px 16px rgba(248,113,113,0.11)' },
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '14%':       { transform: 'scale(1.1)' },
          '28%':       { transform: 'scale(0.95)' },
          '42%':       { transform: 'scale(1.06)' },
          '70%':       { transform: 'scale(1)' },
        },
        'sweep-lr': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(500%)' },
        },
        'flow-packet': {
          '0%':  { transform: 'translateY(-100%)', opacity: '0' },
          '8%':  { opacity: '1' },
          '88%': { opacity: '0.8' },
          '100%':{ transform: 'translateY(1400%)', opacity: '0' },
        },
        'data-pulse': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%':       { opacity: '1', transform: 'scale(1.5)' },
        },
        'glow-brand': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          '50%':       { boxShadow: '0 0 28px 6px rgba(99,102,241,0.12)' },
        },
      },
      animation: {
        'fade-in-up':       'fade-in-up 0.45s ease-out both',
        'fade-in':          'fade-in 0.3s ease-out both',
        'slide-in-left':    'slide-in-left 0.35s ease-out both',
        'slide-in-right':   'slide-in-right 0.35s ease-out both',
        'pulse-glow-red':   'pulse-glow-red 2s ease-in-out infinite',
        'heartbeat':        'heartbeat 0.9s ease-in-out infinite',
        'sweep-lr':         'sweep-lr 2.2s linear infinite',
        'flow-packet':      'flow-packet 3s ease-in-out infinite',
        'data-pulse':       'data-pulse 2s ease-in-out infinite',
        'glow-brand':       'glow-brand 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
