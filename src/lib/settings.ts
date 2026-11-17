import { browser } from "wxt/browser"

export const GAME_MODES = ["bullet", "blitz", "rapid"] as const
export type GameMode = (typeof GAME_MODES)[number]

export const TIME_INTERVALS = {
  "last 6 hours": 6,
  "last 12 hours": 12,
  "last 3 days": 72,
  "last week": 168,
  "last month": 720
} as const
export type TimeInterval = keyof typeof TIME_INTERVALS

export const SCORE_ORDERS = ["wld", "wdl"] as const
export type ScoreOrder = (typeof SCORE_ORDERS)[number]

export const PILL_SIZES = ["small", "medium", "large"] as const
export type PillSize = (typeof PILL_SIZES)[number]

export const STATS_STYLES = ["pill", "box", "outline", "text"] as const
export type StatsStyle = (typeof STATS_STYLES)[number]

/**
 * Stored under the `settings` key in `storage.local`.
 */
export interface Settings {
  popup_darkmode: boolean
  show_stats: boolean
  show_accuracy: boolean
  show_device: boolean
  hide_own_stats: boolean
  game_modes: GameMode[]
  time_interval: TimeInterval
  color_highlighting: boolean
  show_account_age: boolean
  score_order: ScoreOrder
  pill_size: PillSize
  stats_style: StatsStyle
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  popup_darkmode: true,
  show_stats: true,
  show_accuracy: true,
  show_device: true,
  hide_own_stats: false,
  game_modes: [...GAME_MODES],
  time_interval: "last 12 hours",
  color_highlighting: true,
  show_account_age: true,
  score_order: "wld",
  pill_size: "medium",
  stats_style: "pill"
})

const STORAGE_KEY = "settings"

export function intervalMs(interval: TimeInterval): number {
  return TIME_INTERVALS[interval] * 3_600_000
}

/** Merges whatever is stored with the defaults, field by field. */
export function normalizeSettings(raw: unknown): Settings {
  const stored = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    game_modes: [...DEFAULT_SETTINGS.game_modes]
  }

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = stored[key]
    if (typeof DEFAULT_SETTINGS[key] === "boolean") {
      if (typeof value === "boolean") (settings[key] as boolean) = value
    }
  }

  if (
    Array.isArray(stored.game_modes) &&
    stored.game_modes.every((m) => GAME_MODES.includes(m))
  )
    settings.game_modes = [...new Set(stored.game_modes as GameMode[])]

  if (
    typeof stored.time_interval === "string" &&
    stored.time_interval in TIME_INTERVALS
  )
    settings.time_interval = stored.time_interval as TimeInterval

  if (SCORE_ORDERS.includes(stored.score_order as ScoreOrder))
    settings.score_order = stored.score_order as ScoreOrder

  if (PILL_SIZES.includes(stored.pill_size as PillSize))
    settings.pill_size = stored.pill_size as PillSize

  if (STATS_STYLES.includes(stored.stats_style as StatsStyle))
    settings.stats_style = stored.stats_style as StatsStyle

  return settings
}

export async function loadSettings(): Promise<Settings> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY)
    return normalizeSettings(result[STORAGE_KEY])
  } catch {
    return normalizeSettings(undefined)
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEY]: normalizeSettings(settings)
  })
}

export function onSettingsChanged(
  callback: (settings: Settings) => void
): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    area: string
  ) => {
    if (area === "local" && STORAGE_KEY in changes)
      callback(normalizeSettings(changes[STORAGE_KEY].newValue))
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}
