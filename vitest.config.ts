import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing/vitest-plugin"

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: "happy-dom",
    restoreMocks: true,
    coverage: {
      include: ["src/lib/**", "src/content/**", "src/ui/**"],
      reportsDirectory: "tests/coverage",
      reporter: ["text", "html"]
    }
  }
})
