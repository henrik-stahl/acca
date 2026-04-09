import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        fg: ["Franklin Gothic", "sans-serif"],
        "fg-cmpr": ["Franklin Gothic Cmpr", "sans-serif"],
        "fg-book-cmpr": ["ITC Franklin Gothic Book Compressed", "Franklin Gothic Book Cmpr", "Franklin Gothic Cmpr", "sans-serif"],
      },
      colors: {
        sage: {
          50:  "#f2f7f2",
          100: "#e4efe4",
          200: "#c8dfc8",
          300: "#a3c8a3",
          400: "#76ab76",
          500: "#538f53",
          600: "#3f7340",
          700: "#345c35",
          800: "#2b4a2c",
          900: "#243d25",
        },
        acca: {
          yellow: "#ffe500",
          "yellow-hover": "#e6cf00",
          dark: "#1e1e2e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
