import { defineConfig } from "wxt"

import { REPOSITORY_URL } from "./src/lib/config"

const icons = {
  16: "icons/icon16.png",
  48: "icons/icon48.png",
  128: "icons/icon128.png"
}

export default defineConfig({
  srcDir: "src",
  imports: false,
  // the sources zip is for the Firefox Add-ons review, it only needs the code
  zip: {
    excludeSources: [
      "images/**",
      "scripts/**",
      "tests/coverage/**",
      "tests/results.xml"
    ]
  },
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: "Chess Stats",
    description:
      "Shows Win/Lose/Draw, average accuracy and account age for players on chess.com",
    homepage_url: REPOSITORY_URL,
    permissions: browser === "firefox" ? ["storage"] : ["storage", "scripting"],
    host_permissions: ["https://www.chess.com/*", "https://api.chess.com/*"],
    icons,
    action: { default_title: "Chess Stats", default_icon: icons },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "chess-com-insights@thieleju",
          strict_min_version: "140.0",
          data_collection_permissions: { required: ["none"] }
        }
      }
    })
  })
})
