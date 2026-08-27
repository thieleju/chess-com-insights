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
  client?: string
  displayName?: string
}

export interface ApiChessData {
  games: ApiGame[]
}

export interface HydratedGameResponse {
  game: {
    key: string
    endedAt: string
    timeClass: string
    chessGame: {
      whitePlayer: {
        key?: string
        result: string
        ratingDiff?: number
        client?: string
        displayName?: string
        finalRating?: number
        uuid?: string
      }
      blackPlayer: {
        key?: string
        result: string
        ratingDiff?: number
        client?: string
        displayName?: string
        finalRating?: number
        uuid?: string
      }
    }
  }
  analysisMetadata?: {
    whitePlayerMetadata?: {
      accuracy?: number | null
    } | null
    blackPlayerMetadata?: {
      accuracy?: number | null
    } | null
  } | null
}

export interface HydratedGamesResponse {
  hydratedGames: HydratedGameResponse[]
  pagination?: {
    totalSize?: number
    currentPage?: number
    pageSize?: number
  }
}
