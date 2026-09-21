import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A1730",
        "ink-soft": "#241f3f",
        cream: "#FFF8E7",
        marigold: "#FFC94D",
        violet: "#6B4EFF",
        "violet-dim": "#5A3FE0",
        coral: "#FF8A5B",
      },
      fontFamily: {
        display: ["Baloo 2", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
