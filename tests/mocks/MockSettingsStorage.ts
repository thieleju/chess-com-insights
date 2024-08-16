import { Settings, SettingsJSON } from "../../src/types/settings"
import { SettingsStorage } from "../../src/types/wrapper"

import settingsData from "../../settings.json" assert { type: "json" }

const { defaultSettings } = settingsData as SettingsJSON

/**
 * A mock implementation of the SettingsStorage interface for testing purposes.
 */
export class MockSettingsStorage implements SettingsStorage {
  private settings: Settings

  /**
   * Creates an instance of MockSettingsStorage.
   *
   * @param {any} [settings] - Optional initial settings data.
   */
  constructor(settings: Settings = defaultSettings) {
    this.settings = settings
  }

  /**
   * Retrieves stored settings asynchronously.
   *
   * @returns {Promise<any>} A Promise that resolves with the stored settings.
   */
  async getStoredSettings(): Promise<Settings> {
    return this.settings
  }

  /**
   * Saves settings asynchronously.
   *
   * @param {any} settings - The settings data to be saved.
   * @returns {Promise<void>} A Promise that resolves once the settings are saved.
   */
  async saveSettings(settings: Settings): Promise<void> {
    this.settings = settings
  }
}
