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
    },
  },
  plugins: [],
}
