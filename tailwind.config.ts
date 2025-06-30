import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // ★ この行が重要です
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ここでFedExカラーをカスタム定義すると便利です
      colors: {
        'fedex-purple': '#4D148C',
        'fedex-orange': '#FF6600',
      },
    },
  },
  plugins: [],
};
export default config;