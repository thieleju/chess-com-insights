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
