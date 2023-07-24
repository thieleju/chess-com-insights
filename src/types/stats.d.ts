export interface Wld {
  wins: number;
  loses: number;
  draws: number;
  games: number;
}

interface Accuracy {
  avg: number;
  games: number;
}

export interface Stats {
  wld: Wld;
  accuracy: Accuracy;
}

export interface Settings {
  popup_darkmode: boolean;
  show_stats: boolean;
  show_accuracy: boolean;
  hide_own_stats: boolean;
  game_modes: ("blitz" | "rapid" | "bullet" | "daily")[];
  time_interval: string;
  color_highlighting: boolean;
}

export interface TimeIntervals {
  [key: string]: number;
}
