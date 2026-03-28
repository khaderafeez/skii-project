export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        'medical-bg': '#0a0a0a',
        'medical-bg-secondary': '#121212',
        'medical-cyan': '#00d9ff',
        'medical-green': '#00ff88',
        'medical-red': '#ff3366',
        'medical-grid': 'rgba(0, 217, 255, 0.1)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}
