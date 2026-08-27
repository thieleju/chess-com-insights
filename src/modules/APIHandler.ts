import { SettingsJSON, TimeInterval } from "../types/settings"
import {
  ApiChessData,
  ApiGame,
  ApiPlayer,
  HydratedGameResponse,
  HydratedGamesResponse
} from "../types/apidata"

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
    const resolvedUser = await this.resolvePlayerIdentity(username)
    const games: ApiGame[] = []
    let page = this.api.defaultPage
    const pageSize = 50
    // const bounds = getTimeIntervalBounds(timeInterval)

    while (true) {
      const response = await fetch(this.api.archiveEndpoint, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
          Origin: "https://www.chess.com",
          Referer: "https://www.chess.com/"
        },
        body: JSON.stringify({
          criteria: {
            username: resolvedUser.username,
            playerId: resolvedUser.uuid,
            timeClasses: [
              "TIME_CLASS_HYPERBULLET",
              "TIME_CLASS_BULLET",
              "TIME_CLASS_BLITZ",
              "TIME_CLASS_RAPID",
              "TIME_CLASS_CLASSICAL"
            ],
            isVsComputer: false,
            isVsCoach: false,
            page,
            pageSize
            // gameEndTimeFrom: bounds.start,
            // gameEndTimeTo: bounds.end
          },
          fieldMask: "game,analysisMetadata"
        })
      })

      if (!response.ok) {
        const text = await response.text()
        throw Object.assign(
          new Error(
            `Archive request failed (${response.status}): ${text.slice(0, 500)}`
          ),
          { code: response.status }
        )
      }

      const data: HydratedGamesResponse = await response.json()
      const normalizedGames = (data?.hydratedGames ?? []).map((game) =>
        this.normalizeHydratedGame(game)
      )
      const pageGames = normalizedGames.filter((game) =>
        isWithinTimeInterval(game.end_time, timeInterval)
      )

      games.push(...pageGames)

      if (normalizedGames.length < pageSize) break

      const oldestGame = normalizedGames[normalizedGames.length - 1]
      if (
        !oldestGame ||
        !this.checkTimeInterval(oldestGame.end_time, timeInterval)
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
      username: username.toLowerCase(),
      page: effectivePage.toString()
    })

    return `${this.api.archiveEndpoint}?${params.toString()}`
  }

  private async resolvePlayerIdentity(username: string): Promise<{
    username: string
    uuid: string
    userId: string
  }> {
    const profileUrl = `https://www.chess.com/member/${encodeURIComponent(
      username.trim().toLowerCase()
    )}`

    const html = await this.fetchHtml(profileUrl, {
      Referer: "https://www.chess.com/"
    })

    const itemPattern =
      /<div\s+class="cc-section\s+profile-header-container"[^>]*\bdata-username="([^"]+)"[^>]*\bdata-user-id="([^"]+)"[^>]*\bdata-user-uuid="([^"]+)"/i
    const match = html.match(itemPattern)

    if (!match) {
      throw Object.assign(
        new Error(`No profile header with user UUID found for ${username}`),
        { code: 404 }
      )
    }

    return {
      username: String(match[1]),
      userId: String(match[2]),
      uuid: String(match[3])
    }
  }

  private async fetchHtml(
    url: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...extraHeaders
      }
    })

    const text = await res.text()
    if (!res.ok) {
      throw Object.assign(
        new Error(
          `Request failed (${res.status}) for ${url}: ${text.slice(0, 500)}`
        ),
        { code: res.status }
      )
    }

    return text
  }

  private normalizeHydratedGame(game: HydratedGameResponse): ApiGame {
    const whitePlayer = game.game.chessGame.whitePlayer
    const blackPlayer = game.game.chessGame.blackPlayer

    return {
      url: `https://www.chess.com/game/live/${game.game.key}`,
      pgn: "",
      time_control: "",
      end_time: Math.floor(new Date(game.game.endedAt).getTime() / 1000),
      rated: true,
      accuracies: {
        white:
          game.analysisMetadata?.whitePlayerMetadata?.accuracy ?? undefined,
        black: game.analysisMetadata?.blackPlayerMetadata?.accuracy ?? undefined
      },
      tcn: "",
      uuid: game.game.key,
      initial_setup: "",
      fen: "",
      time_class: this.normalizeTimeClass(game.game.timeClass),
      rules: "chess",
      white: this.normalizePlayer(whitePlayer),
      black: this.normalizePlayer(blackPlayer)
    }
  }

  private normalizePlayer(
    player: HydratedGameResponse["game"]["chessGame"]["whitePlayer"]
  ): ApiPlayer {
    return {
      rating: player.finalRating ?? 0,
      result: this.normalizePlayerResult(player.result),
      "@id": player.key ?? player.uuid ?? "",
      username: player.displayName ?? "",
      uuid: player.uuid ?? player.key ?? "",
      client: player.client,
      displayName: player.displayName
    }
  }

  private normalizePlayerResult(result: string): string {
    const upper = result.toUpperCase()

    if (upper.includes("WIN")) return "win"
    if (upper.includes("DRAW") || upper.includes("AGREE")) return "agreed"
    if (
      upper.includes("LOSE") ||
      upper.includes("TIMEOUT") ||
      upper.includes("RESIGN") ||
      upper.includes("ABANDON") ||
      upper.includes("CHECKMATE")
    )
      return "lose"

    return result.toLowerCase()
  }

  private normalizeTimeClass(timeClass: string): string {
    const normalized = timeClass.toLowerCase()

    if (normalized.includes("hyperbullet")) return "bullet"
    if (normalized.includes("bullet")) return "bullet"
    if (normalized.includes("blitz")) return "blitz"
    if (normalized.includes("rapid")) return "rapid"
    if (normalized.includes("classical")) return "rapid"

    return normalized
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
