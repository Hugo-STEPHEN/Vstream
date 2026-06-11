/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#020617',
        panel: '#0B0F19',
        edge: '#1E293B',
        steel: '#334155',
        titanium: '#94A3B8',
        flow: '#22D3EE',
        pull: '#34D399',
        warn: '#FBBF24',
        crit: '#F87171',
        info: '#818CF8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        ui: ['Inter', 'sans-serif'],
      },
      keyframes: {
        bottleneck: {
          '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(248,113,113,0.55)' },
          '50%': { 'box-shadow': '0 0 0 6px rgba(248,113,113,0)' },
        },
      },
      animation: {
        bottleneck: 'bottleneck 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
