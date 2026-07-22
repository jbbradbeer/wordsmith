/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', '"Playfair Display"', "Georgia", "serif"],
        body: ['var(--font-body)', '"DM Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        parchment: {
          50: "#FDFBF7",
          100: "#F8F5EF",
          200: "#F0EBE1",
          300: "#E8E2D8",
          400: "#D8D2C8",
          500: "#B8B2A8",
          600: "#8A8478",
          700: "#6A6460",
          800: "#4A4740",
          900: "#1A1A18",
        },
        gold: {
          DEFAULT: "#8B6914",
          dark: "#7A5C10",
          light: "#A8842A",
        },
        category: {
          elevated: "#8B6914",
          literary: "#6B4C8A",
          punchy: "#C0392B",
          rare: "#1A7A6D",
        },
      },
    },
  },
  plugins: [],
};
