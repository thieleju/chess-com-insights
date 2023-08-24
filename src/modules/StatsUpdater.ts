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

    if (dependencies.urlObserver) this.urlobserver = dependencies.urlObserver
  }

  /**
   * Initialize the StatsUpdater and start updating chess statistics.
   *
   * @param {boolean} attachEventListeners - Whether to attach event listeners for flip board and settings updates.
   * @param {boolean} startObserving - Whether to start observing URL changes.
   */
  initialize(
    attachEventListeners: boolean = true,
    startObserving: boolean = true
  ): void {
    // initial update
    setTimeout(() => {
      this.updateStatsForBothPlayers()
    }, this.settingsJSON.LOAD_DELAY)

    // attach event listeners for flip board and settings updates
    if (attachEventListeners) {
      this.attachFlipBoardClickEvent()
      this.attachSettingsUpdateListener()
    }

    if (!startObserving) return

    // start observing url changes
    this.urlobserver.startObserving()

    // Listen for URL mutations to trigger stats updates
    this.urlobserver.on("url-mutation", () => {
      setTimeout(() => {
        this.updateStatsForBothPlayers()
      }, this.settingsJSON.LOAD_DELAY)
    })
  }

  /**
   * Get update chess statistics for a specific player.
   *
   * @param {("top" | "bottom")} side - The player ("top" or "bottom") for whom to update statistics.
   * @param {string} username - The username of the player.
   * @param {GameMode[]} gameModes - The game modes to include in the statistics.
   * @param {TimeInterval} timeInterval - The time interval to include in the statistics.
   * @param {boolean} showAccuracy - Whether to show accuracy in the statistics.
   * @param {boolean} colorHighlighting - Whether to highlight the player's color in the statistics.
   * @returns {Promise<Stats>} A Promise that resolves with the updated statistics.
   */
  async getUpdateStats(
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
    } catch (error) {
      this.removeInfoElement(side)
      throw `Could not retrieve chess data for ${username}`
    }
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

    const flag = document.querySelector(
      side === "top" ? ".flag-1" : ".flag-2"
    ) as HTMLElement

    if (flag) flag.remove()

    if (!settings.show_stats) return
    if (settings.hide_own_stats && side === "bottom") return

    const stats: Stats = await this.getUpdateStats(
      side,
      this.getUsername(side),
      settings.game_modes,
      settings.time_interval
    )

    this.uiUpdater.updateElement(
      this.getInfoElement(side),
      stats,
      settings.show_accuracy,
      settings.color_highlighting
    )
  }

  /**
   * Attach click event listener to the flip board button.
   */
  private attachFlipBoardClickEvent(): void {
    const flip_board_btn = document.getElementById("board-controls-flip")
    if (!flip_board_btn) return

    flip_board_btn.addEventListener("click", () =>
      this.updateStatsForBothPlayers()
    )
  }

  /**
   * Attach settings update listener.
   */
  private attachSettingsUpdateListener(): void {
    chrome.runtime.onMessage.addListener(
      async (
        request: { action: string },
        _sender: chrome.runtime.MessageSender,
        _sendResponse: (arg0: any) => void
      ) => {
        if (request.action !== "updated-settings") return

        this.updateStatsForBothPlayers(true)
      }
    )
  }

  /**
   * Update chess statistics for both players.
   *
   * @param {boolean} updateSettings - Whether to update settings from storage.
   * @returns {Promise<void>} A Promise that resolves once the statistics are updated for both players.
   */
  async updateStatsForBothPlayers(
    updateSettings: boolean = false
  ): Promise<void> {
    await Promise.all([
      this.updateStatsForPlayer("top", updateSettings),
      this.updateStatsForPlayer("bottom", updateSettings)
    ])
  }

  /**
   * Retrieves the username of a specific player.
   *
   * @private
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to retrieve the username.
   * @returns {string} The username of the player.
   */
  private getUsername(player: "top" | "bottom"): string {
    const target_top = this.settingsJSON.query_selectors.target_top
    const target_bottom = this.settingsJSON.query_selectors.target_bottom
    const target_name = this.settingsJSON.query_selectors.target_name

    const player_el = document.querySelector(
      player === "top"
        ? `.${target_top} .${target_name}`
        : `.${target_bottom} .${target_name}`
    ) as HTMLElement

    return player_el?.innerText || ""
  }

  /**
   * Retrieves the info element for a specific player.
   *
   * @private
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to retrieve the info element.
   * @returns {HTMLElement} The info element for the player.
   */
  private getInfoElement(player: "top" | "bottom"): HTMLElement {
    const info_el_id = `info-el-${player}`
    let info_el = document.getElementById(info_el_id)

    if (!info_el) {
      info_el = this.uiUpdater.createInfoElement(
        player === "top" ? "flag-1" : "flag-2",
        info_el_id
      )
      const player_el = this.getPlayerElement(player)
      player_el?.parentElement?.appendChild(info_el)
    }

    return info_el
  }

  /**
   * Removes the info element for a specific player.
   *
   * @private
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to remove the info element.
   */
  private removeInfoElement(player: "top" | "bottom"): void {
    const info_el_id = `info-el-${player}`
    const info_el = document.getElementById(info_el_id)
    if (info_el) {
      info_el.remove()
    }
  }

  /**
   * Retrieves the player element for a specific player.
   *
   * @private
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to retrieve the player element.
   * @returns {HTMLElement | null} The player element for the player, or null if not found.
   */
  private getPlayerElement(player: "top" | "bottom"): HTMLElement | null {
    const target_top = this.settingsJSON.query_selectors.target_top
    const target_bottom = this.settingsJSON.query_selectors.target_bottom
    const target_name = this.settingsJSON.query_selectors.target_name

    return document.querySelector(
      player === "top"
        ? `.${target_top} .${target_name}`
        : `.${target_bottom} .${target_name}`
    ) as HTMLElement
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
