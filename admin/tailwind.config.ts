import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Lexend", "sans-serif"],
        heading: ["Barlow", "sans-serif"],
        body: ["Lexend", "sans-serif"],
        barlow: ["var(--font-barlow)", "Barlow", "sans-serif"],
        lexend: ["var(--font-lexend)", "Lexend", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#e6f8f0",
          100: "#ccf0e0",
          200: "#a3e5c7",
          500: "#00b562",
          600: "#00914e",
          neon: "#9cff93",
        },
      },
    },
  },
  plugins: [],
};
export default config;
