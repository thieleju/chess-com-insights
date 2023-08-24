import {
  Settings,
  SettingsJSON,
  GameMode,
  TimeInterval
} from "../types/settings"
import { SettingsStorage } from "../types/wrapper"

/**
 * Manages user settings, including retrieval, validation, and storage.
 */
export class SettingsManager {
  private settings: Settings
  private storage: SettingsStorage
  private settingsJSON: SettingsJSON

  /**
   * Creates an instance of SettingsManager.
   *
   * @param {SettingsStorage} settingsStorage - The storage provider for user settings.
   * @param {SettingsJSON} settingsJSON - The predefined settings structure.
   */
  constructor(settingsStorage: SettingsStorage, settingsJSON: SettingsJSON) {
    this.storage = settingsStorage
    this.settingsJSON = settingsJSON
  }

  /**
   * Retrieves user settings from local storage, validates them,
   * and returns valid settings or default settings if invalid.
   *
   * @returns {Promise<Settings>} A Promise that resolves to the user settings object.
   */
  async getSettingsFromStorage(): Promise<Settings> {
    const settings = await this.storage.getStoredSettings()
    const defaultSettings: Settings = this.settingsJSON
      .defaultSettings as Settings

    if (!settings || !this.validateSettings(settings)) {
      await this.saveSettingsToStorage(defaultSettings)
      return defaultSettings
    }

    return settings
  }

  /**
   * Saves user settings to local storage.
   *
   * @param {Settings} settings - The settings object to be saved.
   * @returns {Promise<void>} A Promise that resolves once the settings are saved.
   */
  async saveSettingsToStorage(settings: Settings): Promise<void> {
    await this.storage.saveSettings(settings)
    this.settings = settings
  }

  /**
   * Validates user settings against predefined criteria.
   *
   * @param {Settings} settings - The settings object to be validated.
   * @returns {boolean} True if the settings are valid, otherwise false.
   */
  validateSettings(settings: Settings): boolean {
    const validTimeIntervals: TimeInterval[] = this.settingsJSON
      .validTimeIntervals as TimeInterval[]
    const validGameModes: GameMode[] = this.settingsJSON
      .validGameModes as GameMode[]

    const isBoolean = (value: any) => typeof value === "boolean"
    const isValidGameMode = (mode: GameMode) => validGameModes.includes(mode)
    const isValidTimeInterval = (interval: TimeInterval) =>
      validTimeIntervals.includes(interval)

    const invalidSettings = [
      !isBoolean(settings.popup_darkmode),
      !isBoolean(settings.show_stats),
      !isBoolean(settings.show_accuracy),
      !isBoolean(settings.hide_own_stats),
      !Array.isArray(settings.game_modes) ||
        !settings.game_modes.every(isValidGameMode),
      !isValidTimeInterval(settings.time_interval),
      !isBoolean(settings.color_highlighting)
    ]

    if (invalidSettings.some((invalid) => invalid)) return false

    return true
  }

  /**
   * Returns the user settings object.
   *
   * @param {boolean} updateSettings - Indicates whether to update settings from storage.
   * @returns {Promise<Settings>} The user settings object.
   */
  async getSettings(updateSettings: boolean = false): Promise<Settings> {
    if (!this.settings || updateSettings)
      this.settings = await this.getSettingsFromStorage()

    return this.settings
  }

  /**
   * Returns the predefined settings structure.
   *
   * @returns {SettingsJSON} The predefined settings structure.
   */
  getSettingsJSON(): SettingsJSON {
    return this.settingsJSON
  }
}
