import { SettingsJSON } from "./settings"
import { SettingsManager } from "../modules/SettingsManager"
import { APIHandler } from "../modules/APIHandler"
import { UiUpdater } from "../modules/UiUpdater"
import { UrlObserver } from "../modules/UrlObserver"
import { StatsCalculator } from "../modules/StatsCalculator"
import { UiWindow } from "./wrapper"

export interface DependencyContainer {
  settingsJSON: SettingsJSON
  settingsManager: SettingsManager
  apiHandler: APIHandler
  uiUpdater: UiUpdater
  statsCalculator: StatsCalculator
  urlObserver: UrlObserver
  uiWindow: UiWindow
}
