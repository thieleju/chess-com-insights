import { Wld, Stats, Settings } from "../types/stats";

export const updateElement = (el: HTMLElement, stats: Stats): void => {
  let str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`;
  if (stats.accuracy.avg != 0) str += ` (${stats.accuracy.avg}%)`;
  el.innerText = str;
};

export const getChessData = async (username: string): Promise<any> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;
  const response = await fetch(url);
  const data = await response.json();
  const settings: Settings = await getSettingsFromStorage();
  const games_filtered = filter_games(data.games, settings);
  const stats = get_stats(games_filtered, username);
  return stats;
};

export const get_stats = (games: any[], username: string): any => {
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
      console.log("unknown resulr", result);
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
  if (!settings.game_modes)
    settings = {
      game_modes: ["blitz", "rapid", "bullet"],
      time_interval: "last 12 hours",
    };

  const time_intervals: Record<string, number> = {
    "last 1 hour": 3600,
    "last 6 hours": 21600,
    "last 12 hours": 43200,
    "last 24 hours": 86400,
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
  return await chrome.storage.local
    .get(["settings"])
    .then((result) => result.settings);
};

export const saveSettingsToStorage = async (
  settings: Settings
): Promise<void> => {
  await chrome.storage.local.set({ settings });
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
