// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/HappyFunLeague/" : "/",
  plugins: [react()],
  build: { outDir: "docs", assetsDir: "assets" },
}));
