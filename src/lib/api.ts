import { browser } from "wxt/browser"

import {
  ALL_TIME_PAGE_SIZE,
  ALL_TIME_RETRY_FIRST_MS,
  ALL_TIME_RETRY_MAX_MS,
  ARCHIVE_ENDPOINT,
  ARCHIVE_MAX_PAGES,
  ARCHIVE_PAGE_SIZE,
  FETCH_RETRIES,
  FETCH_RETRY_DELAY_MS,
  MAX_CACHED_ACCURACIES,
  MAX_CACHED_PLAYERS,
  MEMBER_URL,
  PUBLIC_PLAYER_URL,
  RECENT_GAMES_COUNT
} from "./config"
import type { GameMode } from "./settings"

export type Result = "win" | "loss" | "draw"

export interface GamePlayer {
  username: string
  result?: Result
  accuracy?: number
  client?: string
}

export interface Game {
  id: string
  endTime: number
  mode?: GameMode
  white: GamePlayer
  black: GamePlayer
}

interface HydratedPlayer {
  result?: string
  displayName?: string
  client?: string
}

interface HydratedGame {
  game: {
    key: string
    legacyId?: string
    endedAt: string
    timeClass?: string
    chessGame: { whitePlayer: HydratedPlayer; blackPlayer: HydratedPlayer }
  }
  analysisMetadata?: {
    whitePlayerMetadata?: { accuracy?: number | null } | null
    blackPlayerMetadata?: { accuracy?: number | null } | null
  } | null
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string
  ) {
    super(`Request to ${url} failed with status ${status}`)
  }
}

export class NetworkError extends Error {}

export function isTransient(error: unknown): boolean {
  if (error instanceof NetworkError) return true
  return (
    error instanceof HttpError && (error.status >= 500 || error.status === 429)
  )
}

/**
 * Firefox runs content script requests with the extension's principal;
 * `content.fetch` sends them as the page would (same origin + cookies).
 */
function pageFetch(input: string, init?: RequestInit): Promise<Response> {
  const content = (globalThis as { content?: { fetch?: typeof fetch } }).content
  return content?.fetch ? content.fetch(input, init) : fetch(input, init)
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      let response: Response
      try {
        response = await pageFetch(url, init)
      } catch (error) {
        throw new NetworkError(`Request to ${url} failed: ${String(error)}`)
      }
      if (response.ok) return response
      throw new HttpError(response.status, url)
    } catch (error) {
      if (!isTransient(error) || attempt >= FETCH_RETRIES) throw error
      await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS * attempt))
    }
  }
}

// ---------------------------------------------------------------------------

interface PlayerInfo {
  uuid?: string
  joined?: number
}

const PLAYERS_KEY = "players"

async function readPlayerCache(): Promise<Record<string, PlayerInfo>> {
  try {
    const result = await browser.storage.local.get(PLAYERS_KEY)
    return (result[PLAYERS_KEY] as Record<string, PlayerInfo>) ?? {}
  } catch {
    return {}
  }
}

let cacheWrites: Promise<void> = Promise.resolve()

function writePlayerCache(username: string, info: PlayerInfo): Promise<void> {
  cacheWrites = cacheWrites.then(() => mergePlayerCache(username, info))
  return cacheWrites
}

async function mergePlayerCache(username: string, info: PlayerInfo) {
  const cache = await readPlayerCache()
  const key = username.toLowerCase()
  const merged = { ...cache[key], ...info }
  delete cache[key]
  cache[key] = merged
  const keys = Object.keys(cache)
  for (const old of keys.slice(
    0,
    Math.max(0, keys.length - MAX_CACHED_PLAYERS)
  ))
    delete cache[old]
  try {
    await browser.storage.local.set({ [PLAYERS_KEY]: cache })
  } catch {
    // caching is best effort
  }
}

const PROFILE_PATTERN =
  /profile-header-container"[^>]*\bdata-user-uuid="([^"]+)"/i

export async function getPlayerUuid(username: string): Promise<string> {
  const cached = (await readPlayerCache())[username.toLowerCase()]
  if (cached?.uuid) return cached.uuid

  const url = MEMBER_URL + encodeURIComponent(username.toLowerCase())
  const html = await (await request(url)).text()
  const uuid = html.match(PROFILE_PATTERN)?.[1]
  if (!uuid) throw new HttpError(404, url)

  await writePlayerCache(username, { uuid })
  return uuid
}

/** Returns the account creation date as unix time in milliseconds. */
export async function getJoinDate(username: string): Promise<number> {
  const cached = (await readPlayerCache())[username.toLowerCase()]
  if (cached?.joined) return cached.joined

  const url = PUBLIC_PLAYER_URL + encodeURIComponent(username.toLowerCase())
  const data = (await (await request(url)).json()) as { joined?: number }
  if (!data.joined) throw new HttpError(404, url)

  const joined = data.joined * 1000
  await writePlayerCache(username, { joined })
  return joined
}

// ---------------------------------------------------------------------------

export interface ModeRecord {
  rating?: number
  peak?: { rating: number; date?: number }
  wins: number
  losses: number
  draws: number
}

export type LifetimeStats = Partial<Record<GameMode, ModeRecord>>

interface PublicModeStats {
  last?: { rating?: number }
  best?: { rating?: number; date?: number }
  record?: { win?: number; loss?: number; draw?: number }
}

export async function fetchLifetimeStats(
  username: string
): Promise<LifetimeStats> {
  const url = `${PUBLIC_PLAYER_URL}${encodeURIComponent(username.toLowerCase())}/stats`
  const data = (await (await request(url)).json()) as Record<
    string,
    PublicModeStats | undefined
  >
  const stats: LifetimeStats = {}
  for (const mode of ["bullet", "blitz", "rapid"] as const) {
    const entry = data[`chess_${mode}`]
    if (!entry?.record) continue
    const best = entry.best?.rating
    stats[mode] = {
      rating: entry.last?.rating,
      peak: best
        ? {
            rating: best,
            date: entry.best?.date ? entry.best.date * 1000 : undefined
          }
        : undefined,
      wins: entry.record.win ?? 0,
      losses: entry.record.loss ?? 0,
      draws: entry.record.draw ?? 0
    }
  }
  return stats
}

// ---------------------------------------------------------------------------
// Game archive

export function parseResult(raw: string | undefined): Result | undefined {
  const value = (raw ?? "").toUpperCase()
  if (value.includes("WIN")) return "win"
  if (/DRAW|AGREE|STALEMATE|REPETITION|INSUFFICIENT|50|FIFTY/.test(value))
    return "draw"
  if (/LOS[ET]|TIMEOUT|RESIGN|ABANDON|CHECKMATE/.test(value)) return "loss"
  return undefined
}

export function parseMode(raw: string | undefined): GameMode | undefined {
  const value = (raw ?? "").toLowerCase()
  if (value.includes("bullet")) return "bullet"
  if (value.includes("blitz")) return "blitz"
  if (value.includes("rapid") || value.includes("classical")) return "rapid"
  return undefined
}

function toPlayer(
  player: HydratedPlayer,
  accuracy: number | null | undefined
): GamePlayer {
  return {
    username: player.displayName ?? "",
    result: parseResult(player.result),
    accuracy: accuracy ?? undefined,
    client: player.client
  }
}

export function toGame({ game, analysisMetadata }: HydratedGame): Game {
  return {
    id: game.legacyId ?? game.key,
    endTime: new Date(game.endedAt).getTime(),
    mode: parseMode(game.timeClass),
    white: toPlayer(
      game.chessGame.whitePlayer,
      analysisMetadata?.whitePlayerMetadata?.accuracy
    ),
    black: toPlayer(
      game.chessGame.blackPlayer,
      analysisMetadata?.blackPlayerMetadata?.accuracy
    )
  }
}

async function fetchArchivePage(
  username: string,
  playerId: string,
  page: number,
  pageSize = ARCHIVE_PAGE_SIZE
): Promise<{ games: Game[]; received: number; total?: number }> {
  const response = await request(ARCHIVE_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      criteria: {
        username,
        playerId,
        timeClasses: [
          "TIME_CLASS_HYPERBULLET",
          "TIME_CLASS_BULLET",
          "TIME_CLASS_BLITZ",
          "TIME_CLASS_RAPID",
          "TIME_CLASS_CLASSICAL"
        ],
        isVsComputer: false,
        isVsCoach: false,
        page,
        pageSize
      },
      fieldMask: "game,analysisMetadata"
    })
  })
  const data = (await response.json()) as {
    hydratedGames?: HydratedGame[]
    pagination?: { totalSize?: number }
  }
  return {
    games: (data.hydratedGames ?? [])
      .filter(
        (h) => h.game?.chessGame?.whitePlayer && h.game.chessGame.blackPlayer
      )
      .map(toGame),
    received: data.hydratedGames?.length ?? 0,
    total: data.pagination?.totalSize
  }
}

export async function fetchGames(
  username: string,
  since: number
): Promise<Game[]> {
  const playerId = await getPlayerUuid(username)
  const games: Game[] = []

  for (let page = 1; page <= ARCHIVE_MAX_PAGES; page++) {
    const { games: pageGames, received } = await fetchArchivePage(
      username,
      playerId,
      page
    )
    games.push(...pageGames.filter((g) => g.endTime >= since))

    const oldest = pageGames.at(-1)
    if (received < ARCHIVE_PAGE_SIZE || (oldest && oldest.endTime < since))
      break
  }

  return games
}

export async function fetchRecentGames(
  username: string,
  count = RECENT_GAMES_COUNT
): Promise<Game[]> {
  const playerId = await getPlayerUuid(username)
  return (await fetchArchivePage(username, playerId, 1, count)).games
}

// ---------------------------------------------------------------------------

export interface AccuracyTotals {
  sum: number
  analyzed: number
  games: number
}

export interface AllTimeAccuracy {
  modes: Partial<Record<GameMode, AccuracyTotals>>
  fetchedAt: number
  archived?: number
}

export type LoaderStatus = "idle" | "loading" | "stopped" | "failed" | "done"

const ACCURACY_KEY = "accuracy"

async function readCache<T>(storageKey: string): Promise<Record<string, T>> {
  try {
    const result = await browser.storage.local.get(storageKey)
    return (result[storageKey] as Record<string, T>) ?? {}
  } catch {
    return {}
  }
}

async function writeCache<T>(
  storageKey: string,
  key: string,
  value: T
): Promise<void> {
  const cache = await readCache<T>(storageKey)
  delete cache[key]
  cache[key] = value
  const keys = Object.keys(cache)
  for (const old of keys.slice(
    0,
    Math.max(0, keys.length - MAX_CACHED_ACCURACIES)
  ))
    delete cache[old]
  try {
    await browser.storage.local.set({ [storageKey]: cache })
  } catch {
    // caching is best effort
  }
}

class Cancelled extends Error {}

/**
 * Goes through a player's whole archive to sum up the accuracy per mode
 */
export class AllTimeAccuracyLoader {
  status: LoaderStatus = "idle"
  loaded = 0
  total?: number
  retrying = false
  result: AllTimeAccuracy = { modes: {}, fetchedAt: 0 }
  private page = 1
  private previous?: number
  private generation = 0
  private listeners = new Set<() => void>()
  private ready: Promise<void>

  constructor(private username: string) {
    this.ready = this.restore()
  }

  whenReady(): Promise<void> {
    return this.ready
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): void {
    if (this.status === "loading" || this.status === "done") return
    this.status = "loading"
    this.emit()
    void this.run(++this.generation)
  }

  /**
   * Goes through the whole archive again
   */
  reload(): void {
    if (this.status === "loading") return
    this.generation++
    this.previous = this.result.archived
    this.result = { modes: {}, fetchedAt: 0 }
    this.loaded = 0
    this.total = this.previous
    this.page = 1
    this.status = "idle"
    this.start()
  }

  stop(): void {
    if (this.status !== "loading") return
    this.generation++
    this.status = "stopped"
    this.retrying = false
    this.emit()
  }

  private async restore(): Promise<void> {
    const cached = (await readCache<AllTimeAccuracy>(ACCURACY_KEY))[
      this.username.toLowerCase()
    ]
    if (!cached || this.status !== "idle") return
    cached.archived ??= Object.values(cached.modes).reduce(
      (sum, totals) => sum + (totals?.games ?? 0),
      0
    )
    this.result = cached
    this.loaded = this.total = cached.archived
    this.status = "done"
    this.emit()
  }

  private async run(generation: number): Promise<void> {
    const current = () => generation === this.generation
    try {
      const playerId = await this.patiently(
        () => getPlayerUuid(this.username),
        current
      )
      for (;;) {
        if (!current()) throw new Cancelled()
        const { games, received, total } = await this.patiently(
          () =>
            fetchArchivePage(
              this.username,
              playerId,
              this.page,
              ALL_TIME_PAGE_SIZE
            ),
          current
        )
        if (!current()) throw new Cancelled()
        this.add(games)
        this.loaded += received
        const sizes = [total, this.total, this.previous].filter(
          (size): size is number => !!size && size >= this.loaded
        )
        this.total = sizes.length ? Math.max(...sizes) : undefined
        this.page++
        if (received < ALL_TIME_PAGE_SIZE) break
        this.emit()
      }
      this.result.fetchedAt = Date.now()
      this.result.archived = this.loaded
      this.total = this.loaded
      this.status = "done"
      await this.save()
    } catch (error) {
      if (error instanceof Cancelled || !current()) return
      console.error(
        `[Chess Stats] All-time accuracy of ${this.username} failed`,
        error
      )
      this.status = "failed"
    }
    this.retrying = false
    this.emit()
  }

  private async patiently<T>(
    fn: () => Promise<T>,
    current: () => boolean
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        const result = await fn()
        if (this.retrying) {
          this.retrying = false
          this.emit()
        }
        return result
      } catch (error) {
        if (!isTransient(error) || !current()) throw error
        if (!this.retrying) {
          this.retrying = true
          this.emit()
        }
        const pause = Math.min(
          ALL_TIME_RETRY_MAX_MS,
          ALL_TIME_RETRY_FIRST_MS * 2 ** (attempt - 1)
        )
        await new Promise((r) => setTimeout(r, pause))
        if (!current()) throw new Cancelled()
      }
    }
  }

  private add(games: Game[]): void {
    const name = this.username.toLowerCase()
    for (const game of games) {
      const player =
        game.white.username.toLowerCase() === name
          ? game.white
          : game.black.username.toLowerCase() === name
            ? game.black
            : undefined
      if (!player?.result || !game.mode) continue
      const totals = (this.result.modes[game.mode] ??= {
        sum: 0,
        analyzed: 0,
        games: 0
      })
      totals.games++
      if (player.accuracy !== undefined) {
        totals.sum += player.accuracy
        totals.analyzed++
      }
    }
  }

  private save(): Promise<void> {
    return writeCache(ACCURACY_KEY, this.username.toLowerCase(), this.result)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
