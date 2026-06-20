/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080810",
        cardBg: "rgba(22, 22, 34, 0.8)",
      },
    },
  },
  plugins: [],
}
