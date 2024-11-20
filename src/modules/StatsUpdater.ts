import {
  GameMode,
  Settings,
  SettingsJSON,
  TimeInterval
} from "../types/settings"
import { DependencyContainer } from "../types/dependencycontainer"

import { SettingsManager } from "./SettingsManager"
import { APIHandler } from "./APIHandler"
import { UiUpdater } from "./UiUpdater"
import { UrlObserver } from "./UrlObserver"
import { StatsCalculator } from "./StatsCalculator"

import { ApiChessData } from "../types/apidata"
import { Stats } from "../types/stats"
import { UiWindow } from "../types/wrapper"

/**
 * Class responsible for updating chess statistics and UI elements.
 */
export class StatsUpdater {
  /**
   * Dependencies for the StatsUpdater.
   */
  private settingsJSON: SettingsJSON
  private settingsManager: SettingsManager
  private urlobserver: UrlObserver
  private uiUpdater: UiUpdater
  private apiHandler: APIHandler
  private statsCalculator: StatsCalculator
  private urlObserver: UrlObserver
  private uiWindow: UiWindow

  /**
   * Creates an instance of StatsUpdater with dependencies injected through a container.
   * Initializes event listeners for URL mutations to trigger statistics updates.
   *
   * @param {DependencyContainer} dependencies - Dependencies for the StatsUpdater.
   */
  constructor(dependencies: DependencyContainer) {
    // Initialize dependencies
    this.settingsManager = dependencies.settingsManager
    this.uiUpdater = dependencies.uiUpdater
    this.apiHandler = dependencies.apiHandler
    this.settingsJSON = dependencies.settingsJSON
    this.statsCalculator = dependencies.statsCalculator
    this.urlobserver = dependencies.urlObserver
    this.uiWindow = dependencies.uiWindow
  }

  /**
   * Initialize the StatsUpdater and start updating chess statistics.
   *
   * @param {boolean} attachEventListeners - Whether to attach event listeners for flip board and settings updates.
   * @param {boolean} startObserving - Whether to start observing URL changes.
   * @param {boolean} startUpdating - Whether to start updating statistics.
   */
  initialize(
    attachEventListeners: boolean = true,
    startObserving: boolean = true,
    startUpdating: boolean = true
  ): void {
    // initial update
    if (startUpdating) {
      setTimeout(() => {
        this.updateStatsForBothPlayers()
        this.updateTitleForBothPlayers()
      }, this.settingsJSON.LOAD_DELAY)
    }

    // Attach event listeners for flip board and settings updates
    if (attachEventListeners) {
      this.attachButtonClickEvent("board-controls-flip")
      this.attachButtonClickEvent("board-controls-settings")
      this.attachButtonClickEvent("board-controls-theatre")
      this.attachButtonClickEvent("board-controls-focus")
      this.attachSettingsUpdateListener()
    }

    if (!startObserving) return

    // start observing url changes
    this.urlobserver.startObserving()

    // Listen for URL mutations to trigger stats updates
    this.urlobserver.on("url-mutation", () => {
      setTimeout(() => {
        this.updateStatsForBothPlayers()
        this.updateTitleForBothPlayers()
      }, this.settingsJSON.LOAD_DELAY)
    })
  }

  /**
   * Update chess statistics for both players.
   *
   * @param {boolean} updateSettings - Whether to update settings from storage.
   * @returns {Promise<void[]>} A Promise that resolves once the statistics are updated for both players.
   */
  async updateStatsForBothPlayers(
    updateSettings: boolean = false
  ): Promise<void[]> {
    return Promise.all([
      this.updateStatsForPlayer("top", updateSettings),
      this.updateStatsForPlayer("bottom", updateSettings)
    ])
  }

  /**
   * Update chess title for both players.
   *
   * @returns {void}
   */
  updateTitleForBothPlayers(): void {
    this.updateTitleForPlayer("top")
    this.updateTitleForPlayer("bottom")
  }

  /**
   * Update chess title for a specific player.
   *
   * @param {("top" | "bottom")} side - The player ("top" or "bottom") for whom to update title.
   * @returns {void}
   */
  updateTitleForPlayer(side: "top" | "bottom"): void {
    const username = this.uiUpdater.getUsername(side)
    if (!username) return

    const title = this.uiUpdater
      .getPlayerElement(side)
      ?.parentElement?.querySelector(".cci-custom-title")
    if (title) title.remove()

    // check if user has a special Title
    const specialTitles = this.settingsJSON.specialTitles
    if (!specialTitles) return
    const specialTitle = specialTitles[username]
    if (!specialTitle) return

    // give player title if applicable
    this.uiUpdater.updateTitleElement(side, specialTitle)
  }

  /**
   * Update chess statistics for a specific player.
   *
   * @param {("top" | "bottom")} side - The player ("top" or "bottom") for whom to update statistics.
   * @param {boolean} updateSettings - Whether to update settings from storage.
   * @returns {Promise<void>} A Promise that resolves once the statistics are updated.
   */
  async updateStatsForPlayer(
    side: "top" | "bottom",
    updateSettings: boolean = false
  ): Promise<void> {
    const settings: Settings =
      await this.settingsManager.getSettings(updateSettings)

    const flag = this.uiUpdater.getFlagElement(side)

    if (flag) flag.remove()

    if (!settings.show_stats) return
    if (settings.hide_own_stats && side === "bottom") return

    const username = this.uiUpdater.getUsername(side)
    if (!username) throw `No username found for side ${side}`

    const stats: Stats = await this.getStats(
      side,
      username,
      settings.game_modes,
      settings.time_interval
    )
    this.uiUpdater.updateElement(
      side,
      stats,
      settings.show_accuracy,
      settings.color_highlighting,
      settings.time_interval
    )
  }

  /**
   * Get update chess statistics for a specific player.
   *
   * @param {("top" | "bottom")} side - The player ("top" or "bottom") for whom to update statistics.
   * @param {string} username - The username of the player.
   * @param {GameMode[]} gameModes - The game modes to include in the statistics.
   * @param {TimeInterval} timeInterval - The time interval to include in the statistics.
   * @returns {Promise<Stats>} A Promise that resolves with the updated statistics.
   */
  async getStats(
    side: "top" | "bottom",
    username: string,
    gameModes: GameMode[],
    timeInterval: TimeInterval
  ): Promise<Stats> {
    try {
      const data: ApiChessData = await this.apiHandler.getChessData(username)

      return this.statsCalculator.calculateStats(
        data.games,
        gameModes,
        timeInterval,
        username
      )
    } catch {
      this.uiUpdater.removeInfoElement(side)
      throw `Could not retrieve chess data for ${username}`
    }
  }

  /**
   * Attach click event listeners to specified buttons.
   */
  private attachButtonClickEvent(buttonId: string): void {
    const button = this.uiWindow.getDocument().getElementById(buttonId)
    if (!button) return

    button.addEventListener("click", () => {
      this.updateStatsForBothPlayers()
      this.updateTitleForBothPlayers()
    })
  }

  /**
   * Attach settings update listener.
   */
  private attachSettingsUpdateListener(): void {
    import("webextension-polyfill").then((browser) => {
      browser.runtime.onMessage.addListener(async (message) => {
        const request = message as { action: string }
        if (request.action !== "updated-settings") return
        this.updateStatsForBothPlayers(true)
        this.updateTitleForBothPlayers()
      })
    })
  }

  getUiUpdater(): UiUpdater {
    return this.uiUpdater
  }

  getSettingsManager(): SettingsManager {
    return this.settingsManager
  }

  getApiHandler(): APIHandler {
    return this.apiHandler
  }

  getStatsCalculator(): StatsCalculator {
    return this.statsCalculator
  }

  getSettingsJSON(): SettingsJSON {
    return this.settingsJSON
  }
}
