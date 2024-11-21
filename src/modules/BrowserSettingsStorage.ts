import browser from "webextension-polyfill"

import { Settings } from "../types/settings"
import { SettingsStorage } from "../types/wrapper"

/**
 * A SettingsStorage implementation that uses Browser's local storage.
 */
export class BrowserSettingsStorage implements SettingsStorage {
  /**
   * Retrieves the stored settings from Browser's local storage.
   *
   * @returns {Promise<Settings>} A Promise that resolves to the stored settings.
   */
  async getStoredSettings(): Promise<Settings> {
    return browser.storage.local
      .get(["settings"])
      .then((result) => result.settings) as Promise<Settings>
  }

  /**
   * Saves the given settings to Browser's local storage.
   *
   * @param settings - The settings to save.
   * @returns {Promise<void>} A Promise that resolves once the settings are saved.
   */
  async saveSettings(settings: Settings): Promise<void> {
    return browser.storage.local.set({ settings })
  }
}
