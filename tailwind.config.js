/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f1f6f2',
          100: '#ddebe0',
          200: '#bcd7c3',
          300: '#90bb9c',
          400: '#5f9a70',
          500: '#3f7d52',
          600: '#2e6340',
          700: '#254f34',
          800: '#1b3d28',
          900: '#12301f',
          950: '#0a1f14',
        },
        leaf: {
          50: '#f2fbf3',
          100: '#e0f6e2',
          200: '#c1ecc6',
          300: '#8edb98',
          400: '#55c164',
          500: '#31a344',
          600: '#228434',
          700: '#1d682c',
          800: '#1b5326',
          900: '#17451f',
        },
        cream: '#f8f7f1',
        sand: '#eeece1',
        ink: '#1a2419',
        amberish: '#b26a00',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans Kannada',
          'Noto Sans Devanagari',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(18, 48, 31, 0.06), 0 8px 24px -12px rgba(18, 48, 31, 0.18)',
        lift: '0 2px 4px rgba(18, 48, 31, 0.06), 0 18px 40px -20px rgba(18, 48, 31, 0.28)',
      },
      borderRadius: {
        xl2: '1.15rem',
      },
      maxWidth: {
        chat: '54rem',
      },
    },
  },
  plugins: [],
}
