/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body: ['"Inter Tight"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0a0c10',
          900: '#11141a',
          800: '#1a1e26',
          700: '#252a35',
          600: '#363c4a',
          500: '#5a6273',
          400: '#8a93a6',
          300: '#b8bfd0',
          200: '#dce0eb',
          100: '#eef0f7',
        },
        code: {
          1: '#dc2626', // red — medical emergency, do not log here
          2: '#f97316', // orange
          3: '#eab308', // yellow
          4: '#3b82f6', // blue
          5: '#22c55e', // green — lowest severity
        },
        shift: {
          1: '#14b8a6',
          2: '#a855f7',
        },
      },
    },
  },
  plugins: [],
}
