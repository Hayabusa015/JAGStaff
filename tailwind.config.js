/** @type {import('tailwindcss').Config} */
// Ported from ClassOS so the merged "My Classroom" zone keeps its G-MEN gold/ink
// command-center look. Utility classes only emit where used (the classroom views),
// so the existing school components — styled via src/styles.css — are untouched.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // G-MEN gold — anchored on the logo. Never drifts into brown/goldenrod.
        gold: {
          50: '#FFF8E6',
          100: '#FFEFC2',
          200: '#FFE08A',
          300: '#FFD24A',
          400: '#F8C01F',
          500: '#F5B301', // primary brand gold
          600: '#E0A400',
          700: '#D69A12',
          800: '#A8780E',
          900: '#7A5708',
        },
        // Near-black surfaces for a deep, modern dark mode.
        ink: {
          950: '#08080A',
          900: '#0C0C0F',
          850: '#101015',
          800: '#16161B',
          750: '#1C1C22',
          700: '#24242C',
          600: '#2E2E37',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(245,179,1,0.5)' },
          '70%': { boxShadow: '0 0 0 10px rgba(245,179,1,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(245,179,1,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        spotlight: {
          '0%, 100%': { opacity: '0.5', transform: 'translate(0, 0) scale(1)' },
          '50%': { opacity: '0.8', transform: 'translate(2%, -1%) scale(1.05)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pop-in': 'pop-in 0.25s ease-out',
        'pulse-ring': 'pulse-ring 1.8s infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        spotlight: 'spotlight 12s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      boxShadow: {
        gold: '0 0 24px -4px rgba(245,179,1,0.45)',
        'gold-sm': '0 0 12px -2px rgba(245,179,1,0.35)',
      },
    },
  },
  plugins: [],
};
