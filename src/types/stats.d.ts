export interface Stats {
  wld: Wld;
  accuracy: Accuracy;
}

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
