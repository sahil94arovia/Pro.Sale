/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'SF Pro',
          'Inter',
          'Helvetica Neue',
          'sans-serif'
        ],
        mono: [
          'SF Mono',
          '-apple-system-ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      colors: {
        apple: {
          blue: '#0071e3',
          'blue-hover': '#0077ED',
          oled: '#000000',
          gray: {
            50: '#f5f5f7',
            100: '#e8e8ed',
            200: '#d2d2d7',
            300: '#86868b',
            400: '#6e6e73',
            500: '#424245',
            600: '#262626',
            700: '#171717',
            800: '#0a0a0a',
            900: '#000000',
          },
          glass: 'rgba(255, 255, 255, 0.75)',
          'glass-dark': 'rgba(28, 28, 30, 0.75)',
          green: '#34c759',
          red: '#ff3b30',
          orange: '#ff9500',
          purple: '#af52de',
        }
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '24px',
        '3xl': '40px',
      },
      boxShadow: {
        'apple-subtle': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'apple-card': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'apple-modal': '0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0,0,0,0.1)',
        'apple-glow': '0 0 20px rgba(0, 113, 227, 0.25)',
      }
    },
  },
  plugins: [],
}
