import { Wld, Stats, Settings } from "../types/stats";

const color_wins = "#6b9438";
const color_loses = "#bc403a";
const color_draws = "#b38235";

export const default_settings: Settings = {
  game_modes: ["blitz", "rapid", "bullet"],
  time_interval: "last 12 hours",
  hide_own_stats: false,
  show_accuracy: true,
  show_stats: true,
  popup_darkmode: true,
  color_highlighting: false,
};

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
      `<span style="color: ${color_wins}">${stats.wld.wins}</span>/` +
      `<span style="color: ${color_loses}">${stats.wld.loses}</span>/` +
      `<span style="color: ${color_draws}">${stats.wld.draws}</span>` +
      `</strong>`;
  } else {
    str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`;
  }

  if (stats.accuracy.avg != 0 && showAccuracy)
    str += ` (${stats.accuracy.avg}%)`;
  el.innerHTML = str;
};

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
  const response = await fetch(url);
  const data = await response.json();
  // filter games and collect stats
  const games_filtered = filter_games(data.games, settings);
  const stats: Stats = get_stats(games_filtered, username);
  return stats;
};

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

export const filter_games = (games: any[], settings: any): any[] => {
  // use default settings if settings are not set
  if (!settings.game_modes) {
    // console.log("No settings found, setting to default");
    saveSettingsToStorage(default_settings);
  }

  const time_intervals: Record<string, number> = {
    "last hour": 3600,
    "last 6 hours": 21600,
    "last 12 hours": 43200,
    "last day": 86400,
    "last 3 days": 259200,
    "last week": 604800,
  };

  const current_date = Math.floor(Date.now() / 1000);
  const check_time_interval = (
    end_time: number,
    time_interval: string
  ): boolean => {
    if (end_time > current_date) return false;

    if (time_interval in time_intervals)
      return end_time > current_date - time_intervals[time_interval];

    if (time_interval === "today") {
      const current_day_seconds =
        new Date().getHours() * 3600 +
        new Date().getMinutes() * 60 +
        new Date().getSeconds();
      return end_time > current_date - current_day_seconds;
    }

    if (time_interval === "this month") return true;

    return false;
  };

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
    // console.log("Invalid settings, setting to default", settings);
    saveSettingsToStorage(default_settings);
    settings = default_settings;
  }
  // console.log("read settings", settings);
  return settings;
};

export const saveSettingsToStorage = async (
  settings: Settings
): Promise<void> => {
  await chrome.storage.local.set({ settings });
  // console.log("set settings", settings);
};

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

export const isValidBoolean = (value: unknown): boolean => {
  return typeof value === "boolean";
};

export const isValidString = (value: unknown): boolean => {
  return typeof value === "string";
};

export const isValidGameModes = (modes: string[]): boolean => {
  if (!Array.isArray(modes)) return false;
  const valid_gamemodes = ["blitz", "rapid", "bullet", "daily"];
  return modes.every((mode) => valid_gamemodes.includes(mode));
};
