import { ACCOUNT_AGE_CRITICAL_DAYS, ACCOUNT_AGE_WARNING_DAYS } from "./config"
import type { Game, GamePlayer, Result } from "./api"
import type { GameMode } from "./settings"

export interface Score {
  wins: number
  losses: number
  draws: number
}

export interface Device {
  platform: "phone" | "pc"
  details: string
}

export interface Stats extends Score {
  games: number
  accuracy?: number
  analyzedGames: number
  device?: Device
}

const RESULT_KEY: Record<Result, keyof Score> = {
  win: "wins",
  loss: "losses",
  draw: "draws"
}

export function findPlayer(
  game: Game,
  username: string
): GamePlayer | undefined {
  const name = username.toLowerCase()
  if (game.white.username.toLowerCase() === name) return game.white
  if (game.black.username.toLowerCase() === name) return game.black
  return undefined
}

export function calculateStats(
  games: Game[],
  username: string,
  modes: GameMode[]
): Stats {
  const stats: Stats = {
    wins: 0,
    losses: 0,
    draws: 0,
    games: 0,
    analyzedGames: 0
  }
  let accuracySum = 0

  for (const game of games) {
    const player = findPlayer(game, username)
    if (!player) continue

    if (!stats.device && player.client)
      stats.device = parseDevice(player.client)

    if (!player.result || !game.mode || !modes.includes(game.mode)) continue
    const key = RESULT_KEY[player.result]
    stats[key]++
    stats.games++

    if (player.accuracy !== undefined) {
      accuracySum += player.accuracy
      stats.analyzedGames++
    }
  }

  if (stats.analyzedGames > 0)
    stats.accuracy = Math.round(accuracySum / stats.analyzedGames)

  return stats
}

export function parseDevice(client: string): Device {
  const tokens = client
    .replace(/[()]/g, ";")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean)
  const isPhone = /iphone|ipad|ipod|android|mobile|ios|mobi/i.test(client)

  const find = (pattern: RegExp) => tokens.find((t) => pattern.test(t))
  const browser = find(/chrome|firefox|safari|edge|opera|browser/i)
  // anchored, so app tokens like "Chesscom-iOS/4.10" aren't taken for the OS
  const os = find(/^(windows|mac|linux|chrome os|ios|android)/i)
  const model = find(
    /iphone|ipad|ipod|pixel|galaxy|samsung|xiaomi|oneplus|huawei/i
  )

  const parts = (isPhone ? [model, os, browser] : [os, browser, model]).filter(
    (part, i, list): part is string => !!part && list.indexOf(part) === i
  )

  return {
    platform: isPhone ? "phone" : "pc",
    details: parts.length ? parts.join(" · ") : client.trim()
  }
}

export interface AccountAge {
  days: number
  level?: "warning" | "critical"
}

export function accountAge(joined: number, now = Date.now()): AccountAge {
  const days = Math.max(0, Math.floor((now - joined) / 86_400_000))
  const level =
    days < ACCOUNT_AGE_CRITICAL_DAYS
      ? "critical"
      : days < ACCOUNT_AGE_WARNING_DAYS
        ? "warning"
        : undefined
  return { days, level }
}

export function formatAge(days: number): string {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
  if (days < 1) return "today"
  if (days < 60) return unit(days, "day")
  if (days < 730) return unit(Math.floor(days / 30.44), "month")
  return unit(Math.floor(days / 365.25), "year")
}
