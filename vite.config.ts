import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import logseqPlugin from "vite-plugin-logseq";
import { copyFileSync } from "fs";

export default defineConfig({
  plugins: [
    logseqPlugin(),
    react(),
    {
      name: "copy-package-json",
      closeBundle() {
        copyFileSync("package.json", "dist/package.json");
      },
    },
  ],
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});