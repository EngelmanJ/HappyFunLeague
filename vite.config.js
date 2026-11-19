// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from '@tailwindcss/vite'
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const assetsDirectory = "assets";

function retainPublishedAssets() {
  const retained = new Map();
  let assetsDir;

  return {
    name: "retain-published-assets",
    apply: "build",
    configResolved(config) {
      if (resolve(config.root, config.build.outDir) === resolve(config.root, "docs")) {
        assetsDir = resolve(config.root, config.build.outDir, config.build.assetsDir);
      }
    },
    buildStart() {
      retained.clear();
      if (!assetsDir || !existsSync(assetsDir)) return;

      for (const file of readdirSync(assetsDir, { withFileTypes: true })) {
        if (file.isFile() && /-[\w-]{8}\.[^.]+$/.test(file.name)) {
          retained.set(file.name, readFileSync(resolve(assetsDir, file.name)));
        }
      }
    },
    generateBundle(_options, bundle) {
      for (const [name, source] of retained) {
        const fileName = `${assetsDirectory}/${name}`;
        if (!bundle[fileName]) this.emitFile({ type: "asset", fileName, source });
      }
    },
  };
}

export default defineConfig({
  base: "/HappyFunLeague/",
  plugins: [react(), tailwind(), retainPublishedAssets()],
  build: {
    outDir: "docs",
    assetsDir: assetsDirectory,
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
