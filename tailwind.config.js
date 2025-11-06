/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Inspired by Financial Times & McKinsey professional palette
        salmon: {
          50: '#FFF8F3',
          100: '#FFF1E5',
          200: '#FFE4CC',
          300: '#FFD6B3',
          400: '#FFC299',
          500: '#FFAE80',
          600: '#FF9A66',
          700: '#E8845C',
          800: '#D16D4D',
          900: '#BA5A40',
        },
        navy: {
          50: '#F5F5F6',
          100: '#E8E8EA',
          200: '#D1D1D5',
          300: '#B3B3BA',
          400: '#8C8C96',
          500: '#5A5A66',
          600: '#3D3D47',
          700: '#2E2E36',
          800: '#262629',
          900: '#1A1A1D',
        },
        accent: {
          coral: '#FF7C7C',
          teal: '#2DD4BF',
          gold: '#F59E0B',
          purple: '#A855F7',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h2': ['2.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3': ['1.875rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'h4': ['1.5rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7', letterSpacing: '0' }],
        'body': ['1rem', { lineHeight: '1.7', letterSpacing: '0' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(26, 26, 29, 0.04)',
        'medium': '0 4px 24px rgba(26, 26, 29, 0.08)',
        'hard': '0 8px 32px rgba(26, 26, 29, 0.12)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
