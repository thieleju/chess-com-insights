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
  game_modes: ("blitz" | "rapid" | "bullet" | "daily")[];
  time_interval: string;
}
