import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { crx } from "@crxjs/vite-plugin";

// Node >=17
import manifest from "./manifest.json" assert { type: "json" };

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
});
