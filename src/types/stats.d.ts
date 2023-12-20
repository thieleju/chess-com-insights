export interface Stats {
  wld: Wld
  accuracy: Accuracy
}

export interface Wld {
  wins: number
  loses: number
  draws: number
  games: number
}

export interface Accuracy {
  avg: number
  wld: Wld
}
