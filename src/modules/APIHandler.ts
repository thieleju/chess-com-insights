import { SettingsJSON, TimeInterval } from "../types/settings"
import { ApiChessData, ApiGame, ChessGamesResponse } from "../types/apidata"

import { isWithinTimeInterval } from "./TimeIntervalUtils"

/**
 * Utility class to handle API requests for chess data.
 */
export class APIHandler {
  private FETCH_MAX_RETRIES: number
  private FETCH_RETRY_DELAY: number
  private api: SettingsJSON["api"]

  /**
   * Creates an instance of APIHandler.
   * @param {SettingsJSON} settingsJSON - The JSON object containing settings.
   */
  constructor(settingsJSON: SettingsJSON) {
    this.FETCH_MAX_RETRIES = settingsJSON.FETCH_MAX_RETRIES
    this.FETCH_RETRY_DELAY = settingsJSON.FETCH_RETRY_DELAY
    this.api = settingsJSON.api
  }

  /**
   * Retrieves chess data for a given username.
   * @param {string} username - The username for which to fetch chess data.
   * @returns {Promise<ApiChessData>} A Promise that resolves to the fetched chess data.
   * @throws {string} Throws an error if the maximum number of retries is exceeded.
   */
  async getChessData(
    username: string,
    timeInterval: TimeInterval
  ): Promise<ApiChessData> {
    let retryCount = 0

    while (retryCount < this.FETCH_MAX_RETRIES) {
      try {
        return await this.fetchChessData(username, timeInterval)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error?.code === 301) break

        if (error?.code === 404) throw `User ${username} not found`

        retryCount++
        if (retryCount < this.FETCH_MAX_RETRIES)
          await new Promise((resolve) =>
            setTimeout(resolve, this.FETCH_RETRY_DELAY)
          )
      }
    }
    throw "Max retries exceeded"
  }

  /**
   * Fetches chess data from a given URL.
   *
   * @param {string} url - The URL from which to fetch chess data.
   * @returns {Promise<ApiChessData>} A Promise that resolves to the fetched chess data.
   */
  async fetchChessData(
    username: string,
    timeInterval: TimeInterval
  ): Promise<ApiChessData> {
    const games: ApiGame[] = []
    let page = this.api.defaultPage
    let totalPages = 1

    while (page <= totalPages) {
      const response = await fetch(this.buildUrl(username, page), {
        cache: "no-store"
      })
      const data: ChessGamesResponse = await response.json()

      const pageGames = data?.data || []
      games.push(...pageGames)

      totalPages = data?.meta?.totalPages || totalPages
      if (
        pageGames.length === 0 ||
        this.shouldStopFetching(pageGames, timeInterval)
      )
        break

      page++
    }

    return { games }
  }

  /**
   * Builds the URL for fetching chess data for a given username.
   * @param {string} username - The username for which to build the URL.
   * @returns {string} The built URL for fetching chess data.
   */
  buildUrl(username: string, page?: number): string {
    const effectivePage = page ?? this.api.defaultPage
    const params = new URLSearchParams({
      locale: this.api.locale,
      username: username.toLowerCase(),
      page: effectivePage.toString()
    })

    return `${this.api.callbackBase}/games/extended-archive?${params.toString()}`
  }

  private shouldStopFetching(
    games: ApiGame[],
    timeInterval: TimeInterval
  ): boolean {
    const oldestGame = games[games.length - 1]
    if (!oldestGame) return true

    return !this.checkTimeInterval(oldestGame.end_time, timeInterval)
  }

  private checkTimeInterval(
    endTime: number,
    timeInterval: TimeInterval
  ): boolean {
    return isWithinTimeInterval(endTime, timeInterval)
  }
}
