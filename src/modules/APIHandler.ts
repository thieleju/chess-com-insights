import { DateTime } from "luxon"

import { Settings } from "../types/settings"
import { Stats } from "../types/stats"

import { StatsCalculator } from "./StatsCalculator"

import { MAX_RETRIES, RETRY_DELAY } from "../../settings.json"
import { SettingsManager } from "./SettingsManager"

/**
 * Utility class to handle API requests for chess data.
 */
export class APIHandler {
  private statsCalculator: StatsCalculator

  /**
   * Creates a new instance of APIHandler.
   * @param {SettingsManager} settingsManager - SettingsManager instance.
   * @constructor
   */
  constructor(settingsManager: SettingsManager) {
    this.statsCalculator = new StatsCalculator(settingsManager)
  }

  /**
   * Fetch chess data for a given username and settings.
   *
   * @param {string} username - The username for which to fetch chess data.
   * @param {Settings} settings - Settings object with user preferences.
   * @returns {Promise<Stats>} A Promise that resolves to the chess statistics for the given user.
   */
  async getChessData(username: string, settings: Settings): Promise<Stats> {
    const date = DateTime.local().setZone("America/Los_Angeles")
    const year = date.year
    const month = date.month.toString().padStart(2, "0")
    const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`

    let retryCount = 0
    let stats: Stats = {} as Stats
    let fetchSuccessful = false

    while (retryCount < MAX_RETRIES && !fetchSuccessful) {
      try {
        const response = await fetch(url, {
          cache: "no-store"
        })
        const data = await response.json()
        const games_filtered = await this.statsCalculator.filterGames(
          data.games,
          settings
        )
        stats = this.statsCalculator.calculateStats(games_filtered, username)
        fetchSuccessful = true
      } catch (error: any) {
        if (error?.code === 301) break

        retryCount++
        if (retryCount < MAX_RETRIES)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      }
    }

    if (!fetchSuccessful)
      throw new Error("Failed to fetch chess data after max retries.")

    return stats
  }
}
