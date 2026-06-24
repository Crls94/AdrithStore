/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  // class strategy: dark mode se activa añadiendo class="dark" al <html>
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        // Paleta AdrithStore — nombres sin guión (evita conflicto con variantes Tailwind)
        brand:    "#0D5E4F",
        tealmed:  "#0A3D3A",
        tealdark: "#061A18",
        accent:   "#E07A2F",
        canvas:   "#FAFAF8",
        surface:  "#F1F3F2",
        ink:      "#1F1F1F",
      },

      fontFamily: {
        sans:  ["Inter", "DM Sans", "Segoe UI", "system-ui", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },

      boxShadow: {
        "brand-sm": "0 4px 12px rgba(13,94,79,0.25)",
        "brand-md": "0 8px 24px rgba(13,94,79,0.35)",
        "brand-lg": "0 12px 40px rgba(13,94,79,0.45)",
        "teal-lg":  "0 12px 40px rgba(6,26,24,0.45)",
      },
    },
  },

  plugins: [],
};