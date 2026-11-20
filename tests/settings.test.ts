import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import {
  DEFAULT_SETTINGS,
  intervalMs,
  loadSettings,
  normalizeSettings,
  onSettingsChanged,
  saveSettings
} from "../src/lib/settings"

/** Exactly what v2.x stored under the `settings` key. */
const V2_SETTINGS = {
  game_modes: ["blitz"],
  time_interval: "last week",
  hide_own_stats: true,
  show_accuracy: false,
  show_stats: true,
  popup_darkmode: false,
  color_highlighting: false
}

describe("settings", () => {
  beforeEach(() => fakeBrowser.reset())

  it("keeps settings stored by v2 and fills new keys with defaults", () => {
    expect(normalizeSettings(V2_SETTINGS)).toEqual({
      ...V2_SETTINGS,
      show_account_age: true,
      show_device: true,
      score_order: "wld",
      pill_size: "medium",
      stats_style: "text"
    })
  })

  it("falls back per field instead of resetting everything", () => {
    const settings = normalizeSettings({
      ...V2_SETTINGS,
      time_interval: "today",
      game_modes: ["blitz", "daily"],
      show_accuracy: "yes",
      score_order: "lwd",
      stats_style: "neon",
      pill_size: "huge"
    })
    expect(settings.score_order).toBe("wld")
    expect(settings.stats_style).toBe("text")
    expect(settings.pill_size).toBe("medium")
    expect(settings.time_interval).toBe(DEFAULT_SETTINGS.time_interval)
    expect(settings.game_modes).toEqual(DEFAULT_SETTINGS.game_modes)
    expect(settings.show_accuracy).toBe(DEFAULT_SETTINGS.show_accuracy)
    expect(settings.hide_own_stats).toBe(true)
  })

  it("returns defaults for missing or broken data", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings("nope")).toEqual(DEFAULT_SETTINGS)
  })

  it("does not share the default game_modes array", () => {
    normalizeSettings(undefined).game_modes.pop()
    expect(DEFAULT_SETTINGS.game_modes).toHaveLength(3)
  })

  it("loads v2 settings from storage without overwriting them", async () => {
    await fakeBrowser.storage.local.set({ settings: V2_SETTINGS })
    expect((await loadSettings()).time_interval).toBe("last week")
    expect((await fakeBrowser.storage.local.get("settings")).settings).toEqual(
      V2_SETTINGS
    )
  })

  it("saves under the same key and notifies listeners", async () => {
    const listener = vi.fn()
    const unsubscribe = onSettingsChanged(listener)

    await saveSettings({ ...DEFAULT_SETTINGS, time_interval: "last 3 days" })

    expect(
      (
        (await fakeBrowser.storage.local.get("settings")).settings as {
          time_interval: string
        }
      ).time_interval
    ).toBe("last 3 days")
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ time_interval: "last 3 days" })
    )

    unsubscribe()
    await saveSettings(DEFAULT_SETTINGS)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("converts intervals to milliseconds", () => {
    expect(intervalMs("last 6 hours")).toBe(6 * 3_600_000)
    expect(intervalMs("last week")).toBe(7 * 24 * 3_600_000)
  })
})
