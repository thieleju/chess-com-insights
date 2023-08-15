/// <reference types="chrome" />

import { Settings, SettingsStorage } from "../types/settings"

/**
 * A SettingsStorage implementation that uses Chrome's local storage.
 */
export class ChromeSettingsStorage implements SettingsStorage {
  /**
   * Retrieves the stored settings from Chrome's local storage.
   *
   * @returns {Promise<Settings>} A Promise that resolves to the stored settings.
   */
  async getStoredSettings(): Promise<Settings> {
    return chrome.storage.local
      .get(["settings"])
      .then((result) => result.settings)
  }

  /**
   * Saves the given settings to Chrome's local storage.
   *
   * @param settings - The settings to save.
   * @returns {Promise<void>} A Promise that resolves once the settings are saved.
   */
  async saveSettings(settings: Settings): Promise<void> {
    return chrome.storage.local.set({ settings })
  }
}
