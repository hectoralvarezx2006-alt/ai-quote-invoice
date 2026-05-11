/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c2d4fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#3b6ef6',
          600: '#2550eb',
          700: '#1d3dd8',
          800: '#1e34ae',
          900: '#1e3089',
          950: '#161f53',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fc',
          100: '#f0f2f7',
          200: '#e4e7f0',
          300: '#d1d5e4',
          400: '#9ba3bc',
          500: '#6b7494',
          600: '#4e5670',
          700: '#363d54',
          800: '#1f2437',
          900: '#131826',
          950: '#0b0f1a',
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(0,0,0,.04), 0 0 1px 0 rgba(0,0,0,.08)',
        'card': '0 4px 16px 0 rgba(0,0,0,.06), 0 0 1px 0 rgba(0,0,0,.1)',
        'modal': '0 24px 48px -8px rgba(0,0,0,.18), 0 0 1px 0 rgba(0,0,0,.12)',
        'brand': '0 4px 16px 0 rgba(59,110,246,.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.3s ease forwards',
        'shimmer': 'shimmer 1.8s infinite linear',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
