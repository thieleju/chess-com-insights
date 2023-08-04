import { Settings } from "../types/settings"
import { GameMode, TimeInterval } from "../types/settings"

import {
  defaultSettings,
  validTimeIntervals,
  validGameModes
} from "../../settings.json"

/**
 * Manages user settings, including retrieval, validation, and storage.
 */
export class SettingsManager {
  private static instance: SettingsManager
  private settings: Settings | undefined

  private constructor(s?: Settings) {
    this.settings = s
  }

  /**
   * Returns the singleton instance of SettingsManager.
   *
   * @returns {SettingsManager} The singleton instance of SettingsManager.
   */
  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance)
      SettingsManager.instance = new SettingsManager()

    return SettingsManager.instance
  }

  /**
   * Retrieves user settings from local storage, validates them,
   * and returns valid settings or default settings if invalid.
   *
   * @returns {Promise<Settings>} A Promise that resolves to the user settings object.
   */
  async getSettingsFromStorage(): Promise<Settings> {
    const settings = await chrome.storage.local
      .get(["settings"])
      .then((result) => result.settings)

    const default_settings: Settings = defaultSettings as Settings

    if (!this.validateSettings(settings)) return default_settings

    return settings
  }

  /**
   * Saves user settings to local storage.
   *
   * @param {Settings} settings - The settings object to be saved.
   * @returns {Promise<void>} A Promise that resolves once the settings are saved.
   */
  async saveSettingsToStorage(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ settings })
    this.settings = settings
  }

  /**
   * Validates user settings against predefined criteria.
   *
   * @param {Settings} settings - The settings object to be validated.
   * @returns {boolean} True if the settings are valid, otherwise false.
   */
  validateSettings(settings: Settings): boolean {
    const valid_time_intervals: TimeInterval[] =
      validTimeIntervals as TimeInterval[]
    const valid_game_modes: GameMode[] = validGameModes as GameMode[]

    const isValidGameMode = (mode: GameMode) => valid_game_modes.includes(mode)
    const isValidTimeInterval = (interval: TimeInterval) =>
      valid_time_intervals.includes(interval)

    if (
      typeof settings.popup_darkmode !== "boolean" ||
      typeof settings.show_stats !== "boolean" ||
      typeof settings.show_accuracy !== "boolean" ||
      typeof settings.hide_own_stats !== "boolean" ||
      !Array.isArray(settings.game_modes) ||
      !settings.game_modes.every(isValidGameMode) ||
      !isValidTimeInterval(settings.time_interval) ||
      typeof settings.color_highlighting !== "boolean"
    ) {
      console.error("Invalid settings detected:", settings)
      this.saveDefaultSettingsToStorage()
      return false
    }

    return true
  }

  /**
   * Saves default settings to local storage.
   *
   * @returns {Promise<void>} A Promise that resolves once the settings are saved.
   */
  async saveDefaultSettingsToStorage(): Promise<void> {
    const default_settings: Settings = defaultSettings as Settings
    this.saveSettingsToStorage(default_settings)
  }

  /**
   * Returns the user settings object.
   *
   * @param {boolean} updateSettings - Indicates whether to update settings from storage.
   * @returns {Promise<Settings>} The user settings object.
   */
  async getSettings(updateSettings?: boolean): Promise<Settings> {
    if (!this.settings || updateSettings)
      this.settings = await this.getSettingsFromStorage()

    return this.settings
  }
}
