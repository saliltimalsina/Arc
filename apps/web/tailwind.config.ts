import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Satoshi", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand
        orange: {
          DEFAULT: "#F97316",
          start: "#FF6B5C",
          mid: "#F97316",
          end: "#F5A524",
          soft: "rgba(249,115,22,0.10)",
          glow: "rgba(249,115,22,0.25)",
        },
        // Dark mode surfaces
        dark: {
          bg:    "#0e0f12",
          50:    "#15161B",
          100:   "#181a20",
          200:   "#1f222a",
          300:   "#262a33",
          400:   "#3F4350",
          500:   "#565A63",
          600:   "#6C7180",
          700:   "#9A9FAB",
          800:   "#B7BBC4",
        },
        // Light mode surfaces (warm cream)
        cream: {
          bg:    "#faf9f5",
          50:    "#F7F5F1",
          100:   "#F4F2EC",
          200:   "#EFEBE3",
          300:   "#ECE9E1",
        },
        // Semantic accents
        success: "#17C964",
        info:    "#338EF7",
        purple:  "#8B5CF6",
        danger:  "#F31260",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #FF6B5C 0%, #F97316 50%, #F5A524 100%)",
      },
      boxShadow: {
        "orange-sm":  "0 2px 8px rgba(249,115,22,0.20)",
        "orange-md":  "0 4px 16px rgba(249,115,22,0.28)",
        "orange-lg":  "0 8px 32px rgba(249,115,22,0.35)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
