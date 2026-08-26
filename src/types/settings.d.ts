export type GameMode = "blitz" | "rapid" | "bullet"

export type TimeInterval = "today" | "last 3 days" | "last week" | "last month"

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
  OPEN_TOOLTIP_DELAY: number
  api: {
    callbackBase: string
    locale: string
    defaultPage: number
  }
  query_selectors: {
    top: string
    bottom: string
    normal: {
      username: string
      elementToAppend: string
    }
    compact: {
      username: string
      elementToAppend: string
    }
    badgeComponent: string
  }
  colors: {
    wins: string
    loses: string
    draws: string
  }
  defaultSettings: Settings
  validGameModes: GameMode[]
  validTimeIntervals: TimeInterval[]
  specialTitles: {
    [username: string]: string
  }
}
