import {
  fetchGames,
  fetchRecentGames,
  AllTimeAccuracyLoader,
  fetchLifetimeStats,
  getJoinDate,
  type Game,
  type LifetimeStats,
  type Result
} from "../lib/api"
import {
  DELTA_VISIBLE_MS,
  GAME_END_REFETCH_DELAYS_MS,
  RECENT_GAME_MS,
  SCAN_THROTTLE_MS,
  SPECIAL_TITLES,
  STATS_CACHE_TTL_MS
} from "../lib/config"
import { intervalMs, saveSettings, type Settings } from "../lib/settings"
import { accountAge, calculateStats } from "../lib/stats"
import {
  removeStatsElement,
  renderStats,
  renderTitle,
  updateLayout
} from "../ui/pill"
import { Tooltip, type AccuracyHandle } from "../ui/tooltip"
import {
  SIDES,
  getGameOver,
  getStatsParent,
  getUsername,
  getUsernameElement,
  isDailyGame,
  type Side
} from "./dom"

interface GamesEntry {
  fetchedAt: number
  games?: Game[]
}

/**
 * Keeps the stats next to both player names in sync with chess.com's DOM.
 */
export class Overlay {
  private games = new Map<string, GamesEntry>()
  private joinDates = new Map<string, number | null>()
  private lifetime = new Map<string, Promise<LifetimeStats>>()
  private recordedGames = new Map<string, number>()
  private accuracy = new Map<string, AllTimeAccuracyLoader>()
  private deltas = new Map<string, { result: Result; since: number }>()
  private rendered: Partial<Record<Side, HTMLElement>> = {}
  private gameOverKey?: string
  private handledGames = new Set<string>()
  private observer?: MutationObserver
  private scanTimer?: ReturnType<typeof setTimeout>
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private stopped = false
  readonly tooltip: Tooltip

  constructor(
    private settings: Settings,
    private doc: Document = document
  ) {
    this.tooltip = new Tooltip(
      {
        lifetime: (username) => this.getLifetime(username),
        allTimeAccuracy: (username) => this.getAllTimeAccuracy(username),
        settings: () => this.settings,
        saveSettings: (settings) => void saveSettings(settings)
      },
      doc
    )
  }

  start(): void {
    this.observer = new MutationObserver(() => {
      // Runs before the next paint
      if (
        SIDES.some(
          (side) => this.rendered[side] && !this.rendered[side].isConnected
        )
      )
        this.scan()
      else this.scheduleScan()
    })
    this.observer.observe(this.doc.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
    // web fonts change the glyph metrics the stats are centered with
    this.doc.fonts?.addEventListener("loadingdone", this.relayout)
    // zooming or resizing moves the stats to other (sub)pixels
    this.doc.defaultView?.addEventListener("resize", this.relayout)
    this.scan()
  }

  private relayout = () => this.scheduleScan()

  stop(): void {
    this.stopped = true
    this.observer?.disconnect()
    this.doc.fonts?.removeEventListener("loadingdone", this.relayout)
    this.doc.defaultView?.removeEventListener("resize", this.relayout)
    clearTimeout(this.scanTimer)
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    for (const loader of this.accuracy.values()) loader.stop()
    this.tooltip.close()
    for (const side of SIDES) removeStatsElement(side, this.doc)
  }

  updateSettings(settings: Settings): void {
    this.settings = settings
    this.scan()
  }

  scheduleScan(): void {
    if (this.stopped) return
    this.scanTimer ??= setTimeout(() => {
      this.scanTimer = undefined
      this.scan()
    }, SCAN_THROTTLE_MS)
  }

  scan(): void {
    if (this.stopped) return
    for (const side of SIDES) this.renderSide(side)
    this.detectGameEnd()
  }

  private renderSide(side: Side): void {
    const username = getUsername(side, this.doc)
    const parent = getStatsParent(side, this.doc)
    if (!username || !parent) return

    renderTitle(
      getUsernameElement(side, this.doc)?.parentElement ?? parent,
      SPECIAL_TITLES[username.toLowerCase()]
    )

    const { settings } = this
    if (
      !settings.show_stats ||
      (settings.hide_own_stats && side === "bottom")
    ) {
      removeStatsElement(side, this.doc)
      delete this.rendered[side]
      return
    }

    const games = this.getGames(username)
    if (!games) {
      const current = this.rendered[side]
      if (current && current.dataset.user !== username) {
        current.remove()
        delete this.rendered[side]
      }
      return
    }

    const key = username.toLowerCase()
    const stats = calculateStats(games, username, settings.game_modes)

    const delta = this.deltas.get(key)
    const joined = this.getJoinDate(username)

    const root = renderStats(side, parent, {
      username,
      stats,
      settings: {
        show_accuracy: settings.show_accuracy,
        show_device: settings.show_device,
        color_highlighting: settings.color_highlighting,
        time_interval: settings.time_interval,
        show_account_age: settings.show_account_age,
        score_order: settings.score_order,
        game_modes: settings.game_modes,
        pill_size: settings.pill_size,
        stats_style: settings.stats_style
      },
      age: joined ? { ...accountAge(joined), joined } : undefined,
      delta:
        delta && Date.now() - delta.since < DELTA_VISIBLE_MS ? delta : undefined
    })
    this.rendered[side] = root
    updateLayout(root, getUsernameElement(side, this.doc))
    this.tooltip.bind(root)
    this.tooltip.update(side)
  }

  // -------------------------------------------------------------------------
  // Data

  private cacheKey(username: string): string {
    return `${username.toLowerCase()}|${this.settings.time_interval}`
  }

  private getGames(username: string): Game[] | undefined {
    const entry = this.games.get(this.cacheKey(username))
    if (!entry || Date.now() - entry.fetchedAt > STATS_CACHE_TTL_MS)
      this.loadGames(username)
    return entry?.games
  }

  private loadGames(username: string, onDone?: (games?: Game[]) => void): void {
    const key = this.cacheKey(username)
    const since = Date.now() - intervalMs(this.settings.time_interval)
    const entry: GamesEntry = {
      fetchedAt: Date.now(),
      games: this.games.get(key)?.games
    }
    this.games.set(key, entry)

    fetchGames(username, since)
      .then((games) => {
        entry.games = games
        onDone?.(games)
      })
      .catch((error) => {
        console.error(
          `[Chess Stats] Could not load games of ${username}`,
          error
        )
        onDone?.()
      })
      .finally(() => this.scheduleScan())
  }

  private getJoinDate(username: string): number | undefined {
    const key = username.toLowerCase()
    if (!this.joinDates.has(key)) {
      this.joinDates.set(key, null)
      getJoinDate(username)
        .then((joined) => {
          this.joinDates.set(key, joined)
          this.scheduleScan()
        })
        .catch((error) =>
          console.error(
            `[Chess Stats] Could not load join date of ${username}`,
            error
          )
        )
    }
    return this.joinDates.get(key) ?? undefined
  }

  /**
   * All-time accuracy of a player
   */
  private getAllTimeAccuracy(username: string): AccuracyHandle {
    const key = username.toLowerCase()
    let loader = this.accuracy.get(key)
    if (!loader) {
      loader = new AllTimeAccuracyLoader(username)
      this.accuracy.set(key, loader)
    }
    const current = loader
    return {
      ready: current.whenReady(),
      start: () => current.start(),
      stop: () => current.stop(),
      reload: () => current.reload(),
      subscribe: (listener) => current.subscribe(listener),
      state: () => {
        let sum = 0
        let analyzed = 0
        let games = 0
        for (const mode of this.settings.game_modes) {
          const totals = current.result.modes[mode]
          sum += totals?.sum ?? 0
          analyzed += totals?.analyzed ?? 0
          games += totals?.games ?? 0
        }
        return {
          status: current.status,
          retrying: current.retrying,
          loaded: current.loaded,
          total: current.total ?? this.recordedSize(key, current.loaded),
          accuracy: analyzed ? Math.round(sum / analyzed) : undefined,
          analyzed,
          games
        }
      }
    }
  }

  private recordedSize(key: string, loaded: number): number | undefined {
    const games = this.recordedGames.get(key)
    return games !== undefined && games >= loaded ? games : undefined
  }

  private getLifetime(username: string): Promise<LifetimeStats> {
    const key = username.toLowerCase()
    let promise = this.lifetime.get(key)
    if (!promise) {
      promise = fetchLifetimeStats(username)
      // allow a retry on the next hover if it failed
      promise
        .then((lifetime) => {
          let games = 0
          for (const record of Object.values(lifetime))
            games += record.wins + record.losses + record.draws
          if (games) this.recordedGames.set(key, games)
        })
        .catch(() => this.lifetime.delete(key))
      this.lifetime.set(key, promise)
    }
    return promise
  }

  // -------------------------------------------------------------------------
  // Game end

  /**
   * Reacts once per game to the game-over modal
   */
  private detectGameEnd(): void {
    const gameOver = getGameOver(this.doc)
    if (!gameOver) {
      this.gameOverKey = undefined
      return
    }
    const { gameId } = gameOver
    const key = gameId ?? this.doc.location.pathname
    if (this.gameOverKey === key || (gameId && this.handledGames.has(gameId)))
      return
    this.gameOverKey = key
    if (gameId) this.handledGames.add(gameId)
    if (isDailyGame(this.doc.location)) return

    for (const side of SIDES) {
      const username = getUsername(side, this.doc)
      if (!username) continue
      const games = this.games.get(this.cacheKey(username))?.games
      if (gameId && games?.some((g) => g.id === gameId)) continue
      this.refreshAfterGame(username, gameId)
    }
  }

  /**
   * Requests the latest few games of a player until the game shows up
   */
  private refreshAfterGame(
    username: string,
    gameId: string | undefined,
    attempt = 0
  ): void {
    const retry = () => {
      if (gameId && attempt + 1 < GAME_END_REFETCH_DELAYS_MS.length)
        this.refreshAfterGame(username, gameId, attempt + 1)
    }
    this.later(() => {
      fetchRecentGames(username)
        .then((recent) => {
          const entry = this.games.get(this.cacheKey(username))
          if (!entry?.games) {
            this.loadGames(username)
            return
          }
          const added = this.addGames(entry, recent)
          const found = gameId ? recent.find((g) => g.id === gameId) : added[0]
          if (!found) return retry()
          if (!added.includes(found)) return // already counted
          this.lifetime.delete(username.toLowerCase())
          if (Date.now() - found.endTime < RECENT_GAME_MS)
            this.showDelta(username, found)
          this.scheduleScan()
        })
        .catch((error) => {
          console.error(
            `[Chess Stats] Could not load the latest games of ${username}`,
            error
          )
          retry()
        })
    }, GAME_END_REFETCH_DELAYS_MS[attempt]!)
  }

  /** Adds games of the current period that are missing and returns them */
  private addGames(entry: GamesEntry, recent: Game[]): Game[] {
    const since = Date.now() - intervalMs(this.settings.time_interval)
    const ids = new Set(entry.games?.map((g) => g.id))
    const added = recent.filter((g) => g.endTime >= since && !ids.has(g.id))
    if (added.length)
      entry.games = [...added, ...(entry.games ?? [])].sort(
        (a, b) => b.endTime - a.endTime
      )
    return added
  }

  private showDelta(username: string, game: Game): void {
    const name = username.toLowerCase()
    const player =
      game.white.username.toLowerCase() === name
        ? game.white
        : game.black.username.toLowerCase() === name
          ? game.black
          : undefined
    if (!player?.result || !game.mode) return
    // only games that are part of the shown stats
    if (!this.settings.game_modes.includes(game.mode)) return
    this.deltas.set(name, { result: player.result, since: Date.now() })
    this.later(() => this.scan(), DELTA_VISIBLE_MS + 50)
  }

  private later(fn: () => void, ms: number): void {
    if (this.stopped) return
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      fn()
    }, ms)
    this.timers.add(timer)
  }
}
