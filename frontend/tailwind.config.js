/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        86: "21.5rem", // Or the specific pixel value you need
        90: "22.5rem", // Or the specific pixel value you need
      },
    },
  },
  plugins: [],
};
