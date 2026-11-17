import { browser } from "wxt/browser"
import { defineContentScript } from "wxt/utils/define-content-script"

import { Overlay } from "../content/overlay"
import { loadSettings, onSettingsChanged } from "../lib/settings"
import "../ui/style.css"

export default defineContentScript({
  matches: [
    "https://www.chess.com/play/online*",
    "https://www.chess.com/play/arena/*",
    "https://www.chess.com/game/*",
    "https://www.chess.com/live/game/*",
    "https://www.chess.com/analysis/game/live/*"
  ],
  async main(ctx) {
    // After an update WXT invalidates the previous instance (ctx.onInvalidated),
    // so a re-injected script never runs twice side by side.
    console.log(
      `⚡ Chess Stats v${browser.runtime.getManifest().version} injected`
    )

    const overlay = new Overlay(await loadSettings())
    overlay.start()

    const unsubscribe = onSettingsChanged((settings) =>
      overlay.updateSettings(settings)
    )
    ctx.onInvalidated(() => {
      unsubscribe()
      overlay.stop()
    })
  }
})
