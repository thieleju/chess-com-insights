import { Settings, TimeInterval } from "../types/settings";
import { Stats, Wld } from "../types/stats";

import { SettingsManager } from "./SettingsManager";

import { timeIntervals } from "../../settings.json";

/**
 * A utility class for calculating chess statistics based on filtered games.
 */
export class StatsCalculator {
  private settingsManager: SettingsManager;

  /**
   * Creates a new StatsCalculator instance.
   * @param {SettingsManager} settingsManager SettingsManager instance
   * @constructor
   */
  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
  }

  /**
   * Calculates chess statistics for a given array of games and a username.
   *
   * @param {Array} games - An array of filtered chess games.
   * @param {string} username - The username for which to calculate the statistics.
   * @returns {Stats} Calculated statistics for the given user based on the filtered games.
   */
  calculateStats(games: any[], username: string): Stats {
    let stats: Stats = {
      wld: { wins: 0, loses: 0, draws: 0, games: games.length },
      accuracy: { avg: 0, games: games.length },
    };

    games.forEach((game) => {
      const color =
        game.white.username.toLowerCase() === username.toLowerCase()
          ? "white"
          : "black";
      const accuracies = game.accuracies;

      if (accuracies) stats.accuracy.avg += accuracies[color] || 0;
      else stats.accuracy.games--;

      const result = this.transformResult(game[color].result);
      if (!result) {
        console.error("Unknown result", result);
        return;
      }
      stats.wld[result]++;
    });

    stats.accuracy.avg = parseFloat(
      (stats.accuracy.avg / stats.accuracy.games).toFixed(2)
    );
    if (isNaN(stats.accuracy.avg)) stats.accuracy.avg = 0;

    return stats;
  }

  /**
   * Filters chess games based on user settings.
   *
   * @param {Array} games - An array of chess games to be filtered.
   * @param {Settings} settings - Settings object with user preferences.
   * @returns {Promise<Array>} An array of filtered chess games based on the user settings.
   */
  async filterGames(games: any[], settings: Settings): Promise<any[]> {
    if (!settings.game_modes)
      await this.settingsManager.saveDefaultSettingsToStorage();

    return games
      .filter((game) =>
        Array.isArray(settings.game_modes)
          ? settings.game_modes.includes(game.time_class)
          : game.time_class === settings.game_modes
      )
      .filter((game) =>
        this.checkTimeInterval(game.end_time, settings.time_interval)
      );
  }

  /**
   * Checks if a game end time falls within the specified time interval.
   *
   * @param {number} end_time - End time of the chess game in seconds since epoch.
   * @param {TimeInterval} time_interval - Time interval as a string (e.g., "last 6 hours", "last week").
   * @returns {boolean} True if the game end time falls within the specified time interval, otherwise false.
   */
  checkTimeInterval(end_time: number, time_interval: TimeInterval): boolean {
    const current_date = Math.floor(Date.now() / 1000);

    if (time_interval === "this month") return true;

    if (end_time > current_date) return false;

    if (time_interval in timeIntervals)
      return end_time > current_date - timeIntervals[time_interval];

    return false;
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
        return "wins";
      case "lose":
      case "checkmated":
      case "resigned":
      case "timeout":
      case "abandoned":
      case "bughousepartnerlose":
        return "loses";
      case "agreed":
      case "timevsinsufficient":
      case "repetition":
      case "stalemate":
      case "insufficient":
      case "50move":
        return "draws";
      default:
        console.error(`Cannot transform unknown result: ${result}`);
        return undefined;
    }
  }
}
