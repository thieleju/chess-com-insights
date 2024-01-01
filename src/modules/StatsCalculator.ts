import { ApiGame } from "../types/apidata"
import { GameMode, SettingsJSON, TimeInterval } from "../types/settings"
import { Stats, Wld } from "../types/stats"

/**
 * A utility class for calculating chess statistics based on filtered games.
 */
export class StatsCalculator {
  private validTimeIntervals: { [key: string]: number }

  /**
   * Constructs a new instance of the StatsCalculator class.
   *
   * @param {SettingsJSON} settingsJSON - The settings JSON object.
   */
  constructor(settingsJSON: SettingsJSON) {
    this.validTimeIntervals = settingsJSON.timeIntervalsMS
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
      }
    }

    games.forEach((game) => {
      const color =
        game.white.username.toLowerCase() === username.toLowerCase()
          ? "white"
          : "black"

      const result = this.transformResult(game[color].result)
      if (!result) {
        console.error("Unknown result", result)
        return
      }
      stats.wld[result]++

      if (game.accuracies) {
        stats.accuracy.avg += game.accuracies[color] || 0
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
    return games
      .filter((game) =>
        Array.isArray(gameModes)
          ? gameModes.includes(game.time_class as GameMode)
          : game.time_class === gameModes
      )
      .filter((game) => this.checkTimeInterval(game.end_time, timeInterval))
  }

  /**
   * Checks if a game end time falls within the specified time interval.
   *
   * @param {number} end_time - End time of the chess game in seconds since epoch.
   * @param {TimeInterval} time_interval - Time interval as a string (e.g., "last 6 hours", "last week").
   * @returns {boolean} True if the game end time falls within the specified time interval, otherwise false.
   */
  checkTimeInterval(end_time: number, time_interval: TimeInterval): boolean {
    const current_date = Math.floor(Date.now() / 1000)

    if (time_interval === "this month") return true

    if (end_time > current_date) return false

    if (time_interval in this.validTimeIntervals)
      return end_time > current_date - this.validTimeIntervals[time_interval]

    return false
  }

  /**
   * Transforms a game result string into a corresponding Wld key.
   *
   * @param {string} result - Game result string.
   * @returns {keyof Wld | undefined} A key of the Wld object (e.g., "wins", "loses", "draws") or undefined if the result is unknown.
   */
  transformResult(result: string): keyof Wld | undefined {
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
        throw `Cannot transform unknown result: ${result}`
    }
  }
}
