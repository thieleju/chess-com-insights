// @ts-check

import eslint from "@eslint/js"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

export default defineConfig(
  { ignores: [".output", ".wxt", "dist", "tests/coverage"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly" }
    }
  }
)
