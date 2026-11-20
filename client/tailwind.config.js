/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0B0D10',
          dark: '#07080A',
          sidebar: '#101318',
          card: '#15191E',
          surface: '#1B2026',
          elevated: '#222831',
          hover: '#1E242B',
        },
        border: {
          subtle: '#232931',
          light: '#2E3642',
        },
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981', // Main emerald
          600: '#059669',
          700: '#047857',
        },
        text: {
          primary: '#F3F4F6',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          subtle: '#4B5563',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif'
        ],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        'elevated': '0 10px 30px -5px rgba(0, 0, 0, 0.55)',
        'glow-brand': '0 0 15px -3px rgba(16, 185, 129, 0.2)',
      }
    },
  },
  plugins: [],
}
