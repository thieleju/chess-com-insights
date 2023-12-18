export type GameMode = "blitz" | "rapid" | "bullet" | "daily"

export type TimeInterval =
  | "last hour"
  | "last 6 hours"
  | "last 12 hours"
  | "last day"
  | "last 3 days"
  | "last week"
  | "this month"

export interface Settings {
  popup_darkmode: boolean
  show_stats: boolean
  show_accuracy: boolean
  hide_own_stats: boolean
  game_modes: GameMode[]
  time_interval: TimeInterval
  color_highlighting: boolean
}

export interface SettingsJSON {
  FETCH_MAX_RETRIES: number
  FETCH_RETRY_DELAY: number
  LOAD_DELAY: number
  query_selectors: {
    target_name: string
    target_top: string
    target_bottom: string
  }
  colors: {
    wins: string
    loses: string
    draws: string
  }
  defaultSettings: Settings
  validGameModes: GameMode[]
  validTimeIntervals: TimeInterval[]
  timeIntervalsMS: {
    [key: string]: number
  }
  specialTitles: {
    [username: string]: string
  }
}
