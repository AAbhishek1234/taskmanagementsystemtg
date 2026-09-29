import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ThunderGits brand palette
        navy: {
          DEFAULT: "#081C4E",
          50: "#EEF1F8",
          100: "#D7DEEC",
          200: "#AEBDD9",
          300: "#7F94BF",
          400: "#4C68A0",
          500: "#2A4880",
          600: "#183566",
          700: "#0F274F",
          800: "#0A1D3E",
          900: "#081C4E",
          950: "#050F2B",
        },
        orange: {
          DEFAULT: "#D27740",
          50: "#FCF3EC",
          100: "#F8E3D2",
          200: "#F0C4A4",
          300: "#E7A470",
          400: "#DC8B55",
          500: "#D27740",
          600: "#B25F2E",
          700: "#8C4A24",
          800: "#65361A",
          900: "#3F2210",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(8 28 78 / 0.05), 0 1px 3px 0 rgb(8 28 78 / 0.08)",
        "card-hover": "0 4px 12px 0 rgb(8 28 78 / 0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
