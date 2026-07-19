import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: "#E02020",
          deep: "#B01515",
          glow: "#FF3333",
          dim: "#6B0F0F",
        },
        ink: {
          DEFAULT: "#0A0A0A",
          2: "#111111",
          3: "#1A1A1A",
          4: "#222222",
        },
        line: {
          1: "#2E2E2E",
          2: "#444444",
        },
        smoke: {
          3: "#888888",
          4: "#AAAAAA",
        },
        paper: {
          DEFAULT: "#F5F5F5",
          pure: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["var(--font-barlow)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        md: "10px",
        lg: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
