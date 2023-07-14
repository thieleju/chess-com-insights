import vue from "@vitejs/plugin-vue";
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

import { crx } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Node >=17
import manifest from "./manifest.json" assert { type: "json" };

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify({
      autoImport: true,
    }),
    crx({
      manifest: {
        ...manifest,
        background: { ...manifest.background, type: "module" },
      },
    }),
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    port: 3000,
  },
});
