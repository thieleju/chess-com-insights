export interface ApiGame {
  url: string
  pgn: string
  time_control: string
  end_time: number
  rated: boolean
  accuracies?: {
    white?: number
    black?: number
  }
  tcn: string
  uuid: string
  initial_setup: string
  fen: string
  time_class: string
  rules: string
  white: ApiPlayer
  black: ApiPlayer
}

export interface ApiPlayer {
  rating: number
  result: string
  "@id": string
  username: string
  uuid: string
}

export interface ApiChessData {
  games: ApiGame[]
}

export interface ChessGamesResponse {
  data: ApiGame[]
  meta: {
    totalCount: number
    countPerPage: number
    totalPages: number
    currentPage: number
  }
}
