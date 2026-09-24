// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  base: "/HappyFunLeague/",
  plugins: [react(), tailwind()],
  build: {
    outDir: "docs",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
