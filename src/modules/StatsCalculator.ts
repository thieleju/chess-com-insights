import { ApiGame } from "../types/apidata"
import { GameMode, TimeInterval } from "../types/settings"
import { DeviceInfo, Stats, Wld } from "../types/stats"

import { isWithinTimeInterval, parseGameEndTime } from "./TimeIntervalUtils"

/**
 * A utility class for calculating chess statistics based on filtered games.
 */
export class StatsCalculator {
  private readonly gameModeMap: Record<string, GameMode> = {
    hyperbullet: "bullet",
    lightning: "bullet",
    bullet: "bullet",
    blitz: "blitz",
    standard: "rapid",
    rapid: "rapid",
    classical: "rapid"
  }

  /**
   * Calculates chess statistics for filtered games.
   *
   * @param {ApiGame[]} games - The array of API games.
   * @param {GameMode[]} gameModes - The array of game modes to include.
   * @param {TimeInterval} timeInterval - The time interval for filtering games.
   * @param {string} username - The username for identifying player's games.
   * @returns {Stats} The calculated statistics.
   */
  calculateStats(
    games: ApiGame[],
    gameModes: GameMode[],
    timeInterval: TimeInterval,
    username: string
  ): Stats {
    const device = this.getLatestDeviceInfo(games, username)
    games = this.filterGames(games, gameModes, timeInterval)

    const stats: Stats = {
      wld: { wins: 0, loses: 0, draws: 0, games: games.length },
      accuracy: {
        avg: 0,
        wld: {
          wins: 0,
          loses: 0,
          draws: 0,
          games: games.length
        }
      },
      device
    }

    games.forEach((game) => {
      const playerKey = this.getPlayerKey(game, username)

      if (!playerKey) {
        console.error("Could not determine player for game", game)
        return
      }

      const result = this.transformResult(this.getPlayerResult(game, playerKey))
      if (!result) return
      stats.wld[result]++

      const accuracy = this.getPlayerAccuracy(game, playerKey)
      if (accuracy !== undefined) {
        stats.accuracy.avg += accuracy || 0
        stats.accuracy.wld[result]++
      } else stats.accuracy.wld.games--
    })

    stats.accuracy.avg = parseFloat(
      (stats.accuracy.avg / stats.accuracy.wld.games).toFixed(0)
    )
    if (isNaN(stats.accuracy.avg)) stats.accuracy.avg = 0

    return stats
  }

  /**
   * Filters games based on game modes and time intervals.
   *
   * @param {ApiGame[]} games - The array of API games.
   * @param {GameMode[]} gameModes - The array of game modes to include.
   * @param {TimeInterval} timeInterval - The time interval for filtering games.
   * @returns {ApiGame[]} The filtered array of games.
   */
  filterGames(
    games: ApiGame[],
    gameModes: GameMode[],
    timeInterval: TimeInterval
  ): ApiGame[] {
    return games.filter((game) => {
      const normalizedGameMode = this.gameModeMap[this.getGameTimeClass(game)]

      return (
        !!normalizedGameMode &&
        gameModes.includes(normalizedGameMode) &&
        this.checkTimeInterval(this.getGameEndTime(game), timeInterval)
      )
    })
  }

  /**
   * Checks if a game end time falls within the specified time interval.
   *
   * @param {number} end_time - End time of the chess game in seconds since epoch.
   * @param {TimeInterval} time_interval - Time interval as a string (e.g., "today", "last week").
   * @returns {boolean} True if the game end time falls within the specified time interval, otherwise false.
   */
  checkTimeInterval(end_time: number, time_interval: TimeInterval): boolean {
    return isWithinTimeInterval(end_time, time_interval)
  }

  private getGameTimeClass(game: ApiGame): string {
    return (
      game.time_class ||
      (game as unknown as { gameTimeClass?: string }).gameTimeClass ||
      ""
    )
  }

  private getGameEndTime(game: ApiGame): number {
    const legacyGame = game as unknown as { gameEndTime?: string }
    return parseGameEndTime(game.end_time ?? legacyGame.gameEndTime)
  }

  private getPlayerKey(
    game: ApiGame,
    username: string
  ): "white" | "black" | "user1" | "user2" | undefined {
    const normalizedUsername = username.toLowerCase()
    const white = game.white?.username?.toLowerCase()
    const black = game.black?.username?.toLowerCase()

    if (white === normalizedUsername) return "white"
    if (black === normalizedUsername) return "black"

    const legacyGame = game as unknown as {
      user1?: { username?: string }
      user2?: { username?: string }
    }

    if (legacyGame.user1?.username?.toLowerCase() === normalizedUsername)
      return "user1"
    if (legacyGame.user2?.username?.toLowerCase() === normalizedUsername)
      return "user2"

    return undefined
  }

  private getPlayerResult(
    game: ApiGame,
    playerKey: "white" | "black" | "user1" | "user2"
  ): string {
    if (playerKey === "white" || playerKey === "black") {
      return game[playerKey].result
    }

    const legacyGame = game as unknown as {
      user1Result?: number
      user2Result?: number
    }

    const legacyResult =
      playerKey === "user1" ? legacyGame.user1Result : legacyGame.user2Result

    if (legacyResult === 1) return "win"
    if (legacyResult === 0.5) return "agreed"
    return "lose"
  }

  private getPlayerAccuracy(
    game: ApiGame,
    playerKey: "white" | "black" | "user1" | "user2"
  ): number | undefined {
    if (playerKey === "white" || playerKey === "black") {
      return game.accuracies?.[playerKey] ?? undefined
    }

    const legacyGame = game as unknown as {
      user1Accuracy?: number | null
      user2Accuracy?: number | null
    }

    return playerKey === "user1"
      ? (legacyGame.user1Accuracy ?? undefined)
      : (legacyGame.user2Accuracy ?? undefined)
  }

  private getLatestDeviceInfo(
    games: ApiGame[],
    username: string
  ): DeviceInfo | undefined {
    for (const game of games) {
      const player = this.getPlayer(game, username)
      const client = player?.client?.trim()
      if (!client) continue

      return this.parseClientInfo(client)
    }

    return undefined
  }

  private getPlayer(
    game: ApiGame,
    username: string
  ): (ApiGame["white"] | ApiGame["black"]) | undefined {
    const normalizedUsername = username.toLowerCase()

    if (game.white.username.toLowerCase() === normalizedUsername)
      return game.white
    if (game.black.username.toLowerCase() === normalizedUsername)
      return game.black

    return undefined
  }

  private parseClientInfo(client: string): DeviceInfo {
    const normalizedClient = client.trim()
    const lower = normalizedClient.toLowerCase()
    const isPhone = /iphone|ipad|ipod|android|mobile|ios|mobi/.test(lower)
    const platform: DeviceInfo["platform"] = isPhone ? "phone" : "pc"
    const icon: DeviceInfo["icon"] = isPhone ? "mdi-cellphone" : "mdi-monitor"

    return {
      platform,
      icon,
      summary: `Player last played on ${platform}`,
      details: this.describeClient(normalizedClient, platform),
      rawClient: normalizedClient
    }
  }

  private describeClient(
    client: string,
    platform: DeviceInfo["platform"]
  ): string {
    const tokens = client
      .replace(/[()]/g, ";")
      .split(";")
      .map((token) => token.trim())
      .filter(Boolean)

    const browserToken = tokens.find((token) =>
      /chrome|firefox|safari|edge|opera|browser/i.test(token)
    )
    const osToken = tokens.find((token) =>
      /windows|mac|macos|linux|chrome os|ios|android|iphone|ipad|ipod/i.test(
        token
      )
    )
    const modelToken = tokens.find((token) =>
      /iphone|ipad|ipod|pixel|galaxy|samsung|xiaomi|oneplus|huawei|android/i.test(
        token
      )
    )

    const parts =
      platform === "phone"
        ? [modelToken, osToken, browserToken]
        : [osToken, browserToken, modelToken]

    const filteredParts = parts.filter(
      (part, index, list) => !!part && list.indexOf(part) === index
    ) as string[]

    return filteredParts.length > 0 ? filteredParts.join(" · ") : client
  }

  /**
   * Transforms a game result string into a corresponding Wld key.
   *
   * @param {string} result - Game result string.
   * @returns {keyof Wld | undefined} A key of the Wld object (e.g., "wins", "loses", "draws") or undefined if the result is unknown.
   */
  transformResult(result: string): keyof Wld {
    switch (result) {
      case "win":
        return "wins"
      case "lose":
      case "checkmated":
      case "resigned":
      case "timeout":
      case "abandoned":
      case "bughousepartnerlose":
        return "loses"
      case "agreed":
      case "timevsinsufficient":
      case "repetition":
      case "stalemate":
      case "insufficient":
      case "50move":
        return "draws"
      default:
        throw new Error(`Cannot transform unknown result: ${result}`)
    }
  }
}
