import { DateTime } from "luxon"

import { SettingsJSON } from "../types/settings"
import { ApiChessData } from "../types/apidata"

/**
 * Utility class to handle API requests for chess data.
 */
export class APIHandler {
  private FETCH_MAX_RETRIES: number
  private FETCH_RETRY_DELAY: number

  /**
   * Creates an instance of APIHandler.
   * @param {SettingsJSON} settingsJSON - The JSON object containing settings.
   */
  constructor(settingsJSON: SettingsJSON) {
    this.FETCH_MAX_RETRIES = settingsJSON.FETCH_MAX_RETRIES
    this.FETCH_RETRY_DELAY = settingsJSON.FETCH_RETRY_DELAY
  }

  /**
   * Retrieves chess data for a given username.
   * @param {string} username - The username for which to fetch chess data.
   * @returns {Promise<ApiChessData>} A Promise that resolves to the fetched chess data.
   * @throws {string} Throws an error if the maximum number of retries is exceeded.
   */
  async getChessData(username: string): Promise<ApiChessData> {
    let retryCount = 0

    while (retryCount < this.FETCH_MAX_RETRIES) {
      try {
        const url = this.buildUrl(username)
        const response = await fetch(url, { cache: "no-store" })
        return response.json()
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
   * Builds the URL for fetching chess data for a given username.
   * @param {string} username - The username for which to build the URL.
   * @returns {string} The built URL for fetching chess data.
   */
  buildUrl(username: string): string {
    const date = DateTime.local().setZone("America/Los_Angeles")
    const year = date.year
    const month = date.month.toString().padStart(2, "0")
    return `https://api.chess.com/pub/player/${username}/games/${year}/${month}`
  }
}
