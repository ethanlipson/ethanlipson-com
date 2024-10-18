import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        small: ['var(--font-raleway)'],
        big: ['var(--font-raleway-heavy)'],
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries')],
};
export default config;
