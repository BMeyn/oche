/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Big Shoulders Display'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        serif: ["'Fraunces'", "serif"],
      },
      colors: {
        ink: "#0a0e0c",
        surface: "#141a17",
        surface2: "#1c2420",
        border: "#2a332d",
        "border-soft": "#1f2824",
        cream: "#f2e8d0",
        bone: "#d8cdaf",
        "oche-red": "#e63946",
        "oche-green": "#2d9461",
        electric: "#d4ff3a",
        muted: "#6d736f",
        "muted-soft": "#454b47",
      },
    },
  },
  plugins: [],
};
