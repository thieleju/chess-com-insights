import { Settings } from "../types/settings"

import { SettingsManager } from "./SettingsManager"
import { APIHandler } from "./APIHandler"
import { UiUpdater } from "./UiUpdater"
import { UrlObserver } from "./UrlObserver"

import { query_selectors, LOAD_DELAY } from "../../settings.json"

/**
 * Class responsible for updating chess statistics and UI elements.
 */
export class StatsUpdater {
  private settingsManager: SettingsManager
  private urlobserver: UrlObserver
  private uiUpdater: UiUpdater
  private apiHandler: APIHandler

  /**
   * Creates a new instance of StatsUpdater.
   * Initializes the SettingsManager, UiUpdater, APIHandler, and UrlObserver.
   * @constructor
   */
  constructor() {
    this.settingsManager = SettingsManager.getInstance()

    this.uiUpdater = new UiUpdater()
    this.apiHandler = new APIHandler(this.settingsManager)

    this.urlobserver = new UrlObserver(this, LOAD_DELAY)
    this.urlobserver.startObserving()
  }

  /**
   * Initialize the StatsUpdater and start updating chess statistics.
   */
  initialize(): void {
    // initial update
    setTimeout(() => {
      this.updateStatsForBothPlayers()
    }, LOAD_DELAY)

    this.attachFlipBoardClickEvent()
    this.attachSettingsUpdateListener()
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
   * Update chess statistics for a specific player.
   *
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to update statistics.
   * @param {boolean} updateSettings - Whether to update settings from storage.
   * @returns {Promise<void>} A Promise that resolves once the statistics are updated.
   */
  async updateStatsForPlayer(
    player: "top" | "bottom",
    updateSettings: boolean = false
  ): Promise<void> {
    let settings: Settings = await this.settingsManager.getSettings(
      updateSettings
    )

    const flag = document.querySelector(
      player === "top" ? ".flag-1" : ".flag-2"
    ) as HTMLElement

    if (flag) flag.remove()

    if (!settings.show_stats) return

    if (settings.hide_own_stats && player === "bottom") return

    const player_el = document.querySelector(
      player === "top"
        ? query_selectors.target_top
        : query_selectors.target_bottom
    ) as HTMLElement

    if (!player_el) return

    const info_el = this.uiUpdater.createInfoElement(
      player === "top" ? "flag-1" : "flag-2",
      `info-el-${player}`
    )

    player_el.parentElement?.appendChild(info_el)

    try {
      const chess_data = await this.apiHandler.getChessData(
        player_el.innerText,
        settings
      )
      this.uiUpdater.updateElement(
        info_el,
        chess_data,
        settings.show_accuracy,
        settings.color_highlighting
      )
    } catch (error) {
      console.error(`Chess.com Insights Error:`, error)
      info_el.remove()
    }
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
}
