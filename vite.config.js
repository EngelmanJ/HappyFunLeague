// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/HappyFunLeague/" : "/",
  plugins: [react(), tailwind()],
  build: { outDir: "docs", assetsDir: "assets" },
}));