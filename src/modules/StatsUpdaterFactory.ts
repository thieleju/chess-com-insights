import { SettingsJSON, SettingsStorage } from "../types/settings"

import { SettingsManager } from "./SettingsManager"
import { APIHandler } from "./APIHandler"
import { UiUpdater } from "./UiUpdater"
import { UrlObserver } from "./UrlObserver"
import { ChromeSettingsStorage } from "./ChromeSettingsStorage"
import { StatsUpdater } from "./StatsUpdater"
import { MockSettingsStorage } from "./MockSettingsStorage"
import { StatsCalculator } from "./StatsCalculator"

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
   * @returns {StatsUpdater} A new StatsUpdater instance.
   */
  static createStatsUpdater(
    storageManager: SettingsStorage = new ChromeSettingsStorage()
  ): StatsUpdater {
    return new StatsUpdater({
      settingsJSON,
      settingsManager: new SettingsManager(storageManager, settingsJSON),
      apiHandler: new APIHandler(settingsJSON),
      uiUpdater: new UiUpdater(settingsJSON),
      statsCalculator: new StatsCalculator(settingsJSON),
      urlObserver: new UrlObserver()
    })
  }

  /**
   * Create a new StatsUpdater instance for testing purposes.
   *
   * @param {SettingsStorage} storageManager - The storage manager for settings.
   * @returns {StatsUpdater} A new StatsUpdater instance for testing.
   */
  static createStatsUpdaterForTest(
    storageManager: SettingsStorage = new MockSettingsStorage()
  ): StatsUpdater {
    return new StatsUpdater({
      settingsJSON,
      settingsManager: new SettingsManager(storageManager, settingsJSON),
      apiHandler: new APIHandler(settingsJSON),
      uiUpdater: new UiUpdater(settingsJSON),
      statsCalculator: new StatsCalculator(settingsJSON)
      // urlObserver: new UrlObserver()
    })
  }
}
