import { Wld, Stats, Settings, TimeIntervals } from "../types/stats";

import {
  MAX_RETRIES,
  RETRY_DELAY,
  query_selectors,
  colors,
  defaultSettings,
  timeIntervals,
} from "../../settings.json";

const default_settings: Settings = defaultSettings as Settings;
const time_intervals: TimeIntervals = timeIntervals as TimeIntervals;

let settings: Settings;

/**
 * Update chess statistics for a player
 * @param player "top" or "bottom"
 * @param update_settings Whether to update settings from storage
 * @returns A Promise that resolves once the stats are updated
 */
export async function update_stats(
  player: "top" | "bottom",
  update_settings = false
): Promise<void> {
  // Update settings if not already loaded or if update_settings is true
  if (!settings || update_settings) settings = await getSettingsFromStorage();

  const flag = document.querySelector(
    player === "top" ? ".flag-1" : ".flag-2"
  ) as HTMLElement;

  if (flag) flag.remove();

  if (!settings.show_stats) return;
  if (settings.hide_own_stats && player === "bottom") return;

  const player_el = document.querySelector(
    player === "top"
      ? query_selectors.target_top
      : query_selectors.target_bottom
  ) as HTMLElement;

  if (!player_el) return;

  const info_el = createInfoElement(
    player === "top" ? "flag-1" : "flag-2",
    `info-el-${player}`
  );

  player_el.parentElement?.appendChild(info_el);

  // Get stats for the player and update UI elements
  // If an error occurs, remove the element from DOM and update again
  try {
    const chess_data = await getChessData(player_el.innerText, settings);
    // console.log("chess data for ", player, player_el.innerText, chess_data.wld);
    updateElement(
      info_el,
      chess_data,
      settings.show_accuracy,
      settings.color_highlighting
    );
  } catch (_err) {
    // log error and remove the info element from DOM
    // console.log(_err);
    info_el.remove();
  }
}

/**
 * Update chess statistics for both players
 * @returns A Promise that resolves once both stats are updated
 */
export async function update_stats_both(): Promise<void> {
  await Promise.all([update_stats("top"), update_stats("bottom")]);
}

/**
 * Fetch chess data for a given username and settings
 * @param username The username for which to fetch chess data
 * @param settings Settings object with user preferences
 * @returns A Promise that resolves to the chess statistics for the given user
 */
export const getChessData = async (
  username: string,
  settings: Settings
): Promise<Stats> => {
  // current date
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  // api data
  const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;
  // retry up to MAX_RETRIES times
  let retryCount = 0;
  // return object
  let stats: Stats = {} as Stats;
  let fetchSuccessful = false;

  while (retryCount < MAX_RETRIES && !fetchSuccessful) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });
      // get response data as json
      const data = await response.json();
      // filter games and collect stats
      const games_filtered = filter_games(data.games, settings);
      stats = get_stats(games_filtered, username);
      fetchSuccessful = true;
    } catch (error: any) {
      // exit if status code is 301 (redirect)
      if (error?.code === 301) break;

      retryCount++;
      if (retryCount < MAX_RETRIES)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  // If stats is still null after the loop, handle the error here
  if (!fetchSuccessful) {
    console.log("max retries reached");
    throw new Error("Failed to fetch chess data after max retries.");
  }

  return stats;
};

/**
 * Calculate statistics based on filtered chess games
 * @param games An array of filtered chess games
 * @param username The username for which to calculate the statistics
 * @returns Calculated statistics for the given user based on the filtered games
 */
export const get_stats = (games: any[], username: string): Stats => {
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

    const result = transform_result(game[color].result);
    if (!result) {
      console.log("unknown result", result);
      return;
    }
    stats.wld[result]++;
  });

  stats.accuracy.avg = parseFloat(
    (stats.accuracy.avg / stats.accuracy.games).toFixed(2)
  );
  if (isNaN(stats.accuracy.avg)) stats.accuracy.avg = 0;

  return stats;
};

/**
 * Filter chess games based on user settings
 * @param games An array of chess games to be filtered
 * @param settings Settings object with user preferences
 * @returns An array of filtered chess games based on the user settings
 */
export const filter_games = (games: any[], settings: Settings): any[] => {
  // use default settings if settings are not set
  if (!settings.game_modes) saveSettingsToStorage(default_settings);

  return games
    .filter((game) =>
      Array.isArray(settings.game_modes)
        ? settings.game_modes.includes(game.time_class)
        : game.time_class === settings.game_modes
    )
    .filter((game) =>
      check_time_interval(game.end_time, settings.time_interval)
    );
};

/**
 * Check if a game end time falls within the specified time interval
 * @param end_time End time of the chess game in seconds since epoch
 * @param time_interval Time interval as a string (e.g., "last 6 hours", "last week")
 * @returns True if the game end time falls within the specified time interval, otherwise false
 */
const check_time_interval = (
  end_time: number,
  time_interval: string
): boolean => {
  const current_date = Math.floor(Date.now() / 1000);

  // don't filter if time_interval is "last month" because
  // the api only returns games from the current month
  if (time_interval === "this month") return true;

  if (end_time > current_date) return false;

  if (time_interval in time_intervals)
    return end_time > current_date - time_intervals[time_interval];

  return false;
};

/**
 * Transform a game result string into a corresponding Wld key
 * @param result Game result string
 * @returns A key of the Wld object (e.g., "wins", "loses", "draws") or undefined if the result is unknown
 */
export const transform_result = (result: string): keyof Wld | undefined => {
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
      console.log(`Cannot transform unknown result: ${result}`);
      return undefined;
  }
};

/**
 * Retrieve user settings from the local storage
 * @returns A Promise that resolves to the user settings object
 */
export const getSettingsFromStorage = async (): Promise<any> => {
  let settings = await chrome.storage.local
    .get(["settings"])
    .then((result) => result.settings);
  // check if current settings are valid
  if (
    !isValidBoolean(settings?.popup_darkmode) ||
    !isValidBoolean(settings?.show_accuracy) ||
    !isValidBoolean(settings?.color_highlighting) ||
    !isValidBoolean(settings?.show_stats) ||
    !isValidString(settings?.time_interval) ||
    !isValidGameModes(settings?.game_modes)
  ) {
    console.log("Invalid settings, setting to default", settings);
    saveSettingsToStorage(default_settings);
    settings = default_settings;
  }
  // console.log("read settings", settings);
  return settings;
};

/**
 * Save user settings to the local storage
 * @param settings Settings object to be saved
 * @returns A Promise that resolves once the settings are saved to local storage
 */
export const saveSettingsToStorage = async (
  settings: Settings
): Promise<void> => {
  await chrome.storage.local.set({ settings });
  // console.log("set settings", settings);
};

/**
 * Create an info element for displaying chess statistics
 * @param className Class name for the info element
 * @param id ID attribute for the info element
 * @returns A newly created info element
 */
export const createInfoElement = (
  className: string,
  id: string
): HTMLElement => {
  const infoEl = document.createElement("div");
  infoEl.classList.add("user-tagline-rating", className);
  infoEl.id = id;
  infoEl.style.marginLeft = "10px";
  return infoEl;
};

/**
 * Update an HTML element with chess statistics
 * @param el The HTML element to be updated
 * @param stats Statistics object containing chess statistics
 * @param showAccuracy Flag indicating whether to display accuracy information
 * @param colorHighlighting Flag indicating whether to apply color highlighting to the statistics
 */
export const updateElement = (
  el: HTMLElement,
  stats: Stats,
  showAccuracy: boolean,
  colorHighlighting: boolean
): void => {
  let str;

  if (colorHighlighting) {
    str =
      `<strong>` +
      `<span style="color: ${colors.wins}">${stats.wld.wins}</span>/` +
      `<span style="color: ${colors.loses}">${stats.wld.loses}</span>/` +
      `<span style="color: ${colors.draws}">${stats.wld.draws}</span>` +
      `</strong>`;
  } else {
    str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`;
  }

  if (stats.accuracy.avg != 0 && showAccuracy)
    str += ` (${stats.accuracy.avg}%)`;
  el.innerHTML = str;
};

/**
 * Check if a value is a valid boolean
 * @param value The value to be checked
 * @returns True if the value is a valid boolean, otherwise false
 */
export const isValidBoolean = (value: unknown): boolean => {
  return typeof value === "boolean";
};

/**
 * Check if a value is a valid string
 * @param value The value to be checked
 * @returns True if the value is a valid string, otherwise false
 */
export const isValidString = (value: unknown): boolean => {
  return typeof value === "string";
};

/**
 * Check if an array of game modes is valid
 * @param modes An array of game modes to be checked
 * @returns True if the array contains valid game modes, otherwise false
 */
export const isValidGameModes = (modes: string[]): boolean => {
  if (!Array.isArray(modes)) return false;
  const valid_gamemodes = ["blitz", "rapid", "bullet", "daily"];
  return modes.every((mode) => valid_gamemodes.includes(mode));
};
