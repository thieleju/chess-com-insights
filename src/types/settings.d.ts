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
