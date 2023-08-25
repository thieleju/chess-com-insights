import { SettingsJSON } from "../types/settings"
import { SettingsStorage, UiWindow } from "../types/wrapper"

import { SettingsManager } from "./SettingsManager"
import { APIHandler } from "./APIHandler"
import { UiUpdater } from "./UiUpdater"
import { UrlObserver } from "./UrlObserver"
import { ChromeSettingsStorage } from "./ChromeSettingsStorage"
import { StatsUpdater } from "./StatsUpdater"
import { StatsCalculator } from "./StatsCalculator"
import { BrowserUiWindow } from "./BrowserUiWindow"

import { MockSettingsStorage } from "../../tests/mocks/MockSettingsStorage"

import settingsData from "../../settings.json" assert { type: "json" }

const settingsJSON: SettingsJSON = settingsData as SettingsJSON

/**
 * Factory class for creating instances of StatsUpdater with different settings.
 */
export class StatsUpdaterFactory {
  /**
   * Create a new StatsUpdater instance with the specified settings.
   *
   * @param {SettingsStorage} storageManager - The storage manager for settings.
   * @param {UiWindow} uiWindow - The window object for the browser.
   * @returns {StatsUpdater} A new StatsUpdater instance.
   */
  static createStatsUpdater(
    storageManager: SettingsStorage = new ChromeSettingsStorage(),
    uiWindow: UiWindow = new BrowserUiWindow()
  ): StatsUpdater {
    return new StatsUpdater({
      settingsJSON,
      settingsManager: new SettingsManager(storageManager, settingsJSON),
      apiHandler: new APIHandler(settingsJSON),
      uiUpdater: new UiUpdater(settingsJSON, uiWindow),
      statsCalculator: new StatsCalculator(settingsJSON),
      urlObserver: new UrlObserver(uiWindow),
      uiWindow
    })
  }

  /**
   * Create a new StatsUpdater instance for testing purposes.
   *
   * @param {SettingsStorage} storageManager - The storage manager for settings.
   * @param {UiWindow} uiWindow - The window object for the browser.
   * @returns {StatsUpdater} A new StatsUpdater instance for testing.
   */
  static createStatsUpdaterForTest(
    storageManager: SettingsStorage = new MockSettingsStorage(),
    uiWindow: UiWindow
  ): StatsUpdater {
    return new StatsUpdater({
      settingsJSON,
      settingsManager: new SettingsManager(storageManager, settingsJSON),
      apiHandler: new APIHandler(settingsJSON),
      uiUpdater: new UiUpdater(settingsJSON, uiWindow),
      statsCalculator: new StatsCalculator(settingsJSON),
      urlObserver: new UrlObserver(uiWindow),
      uiWindow
    })
  }
}
