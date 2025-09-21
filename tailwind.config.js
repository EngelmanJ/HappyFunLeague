/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    "bg-slate-950", "text-slate-200", "prose", "prose-invert",
    "border-slate-800", "bg-slate-900/60"
  ],
  theme: { extend: {} },
  plugins: [],
}
