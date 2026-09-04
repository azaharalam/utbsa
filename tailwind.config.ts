import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nil: { DEFAULT: '#1E3050', soft: '#2C4568' },
        muslin: { DEFAULT: '#F4F2EA', deep: '#E7E3D6' },
        kantha: { DEFAULT: '#1F6F55', pale: '#DCE9E1' },
        genda: '#E4A32B',
        alta: '#C43D30',
        ink: { DEFAULT: '#1A1D22', mid: '#5B6270' },
        stitch: '#B9C4B6',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Kohinoor Bangla', 'Nirmala UI', 'sans-serif'],
        body: ['var(--font-body)', 'Nirmala UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
