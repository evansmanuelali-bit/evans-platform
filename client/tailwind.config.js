/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#06070c',
        panel: '#0c0e17',
        panel2: '#11131f',
        line: 'rgba(255,255,255,0.08)',
        accent: '#8b5cf6',
        accent2: '#22d3ee',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px rgba(139,92,246,0.25)',
      },
    },
  },
  plugins: [],
};
