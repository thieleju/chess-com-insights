import { browser } from "wxt/browser"
import { defineBackground } from "wxt/utils/define-background"

/**
 * Chrome only injects content scripts into tabs opened after install/update,
 * so already open chess.com tabs get the script injected here.
 * Firefox does this on its own, which is why this script is Chrome only.
 */
export default defineBackground({
  include: ["chrome", "edge", "opera"],
  main() {
    browser.runtime.onInstalled.addListener(async () => {
      const matches = browser.runtime
        .getManifest()
        .content_scripts?.flatMap((script) => script.matches ?? [])
      if (!matches?.length) return

      for (const tab of await browser.tabs.query({ url: matches })) {
        if (tab.id === undefined) continue
        const target = { tabId: tab.id }
        browser.scripting
          .insertCSS({ target, files: ["content-scripts/content.css"] })
          .catch(() => undefined)
        browser.scripting
          .executeScript({ target, files: ["/content-scripts/content.js"] })
          .catch(() => undefined)
      }
    })
  }
})
