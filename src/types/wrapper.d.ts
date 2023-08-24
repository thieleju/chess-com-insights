import { Settings } from "./settings"

export interface SettingsStorage {
  getStoredSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
}

export interface UiWindow {
  getWindow(): Window
  getDocument(): Document
  initialize?(): Promise<void>
}
