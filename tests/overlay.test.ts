import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { Overlay } from "../src/content/overlay"
import {
  fetchGames,
  fetchRecentGames,
  AllTimeAccuracyLoader,
  fetchLifetimeStats,
  getJoinDate,
  type Game
} from "../src/lib/api"
import {
  DELTA_VISIBLE_MS,
  GAME_END_REFETCH_DELAYS_MS,
  STATS_CACHE_TTL_MS
} from "../src/lib/config"
import { DEFAULT_SETTINGS, type Settings } from "../src/lib/settings"
import {
  DAY,
  NOW,
  closeGameOver,
  game,
  mountBoard,
  showGameOver
} from "./fixtures"

vi.mock("../src/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/api")>()),
  fetchGames: vi.fn(),
  fetchRecentGames: vi.fn(),
  // a loader that finishes as soon as it is started
  AllTimeAccuracyLoader: vi.fn(function (this: Record<string, unknown>) {
    const listeners = new Set<() => void>()
    Object.assign(this, {
      status: "idle",
      loaded: 0,
      total: undefined,
      result: { modes: {}, fetchedAt: 0 },
      whenReady: () => Promise.resolve(),
      stop: vi.fn(),
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      start: vi.fn(() => {
        Object.assign(this, {
          status: "done",
          loaded: 8,
          total: 8,
          result: {
            modes: {
              blitz: { sum: 160, analyzed: 2, games: 3 },
              bullet: { sum: 90, analyzed: 1, games: 5 }
            },
            fetchedAt: 0
          }
        })
        listeners.forEach((listener) => listener())
      })
    })
  }),
  fetchLifetimeStats: vi.fn(),
  getJoinDate: vi.fn()
}))

const fetchGamesMock = vi.mocked(fetchGames)
const recentMock = vi.mocked(fetchRecentGames)
const lifetimeMock = vi.mocked(fetchLifetimeStats)
const loaderMock = vi.mocked(AllTimeAccuracyLoader)
const getJoinDateMock = vi.mocked(getJoinDate)
const [FIRST_REFETCH, SECOND_REFETCH] = GAME_END_REFETCH_DELAYS_MS as [
  number,
  number
]

let archive: Game[]

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    game_modes: [...DEFAULT_SETTINGS.game_modes],
    ...overrides
  }
}

const stats = (side: "top" | "bottom") =>
  document.querySelector<HTMLElement>(`.ccs-stats[data-side="${side}"]`)
const score = (side: "top" | "bottom") =>
  stats(side)?.querySelector(".ccs-score")?.textContent

describe("Overlay", () => {
  let overlay: Overlay

  async function start(options: Partial<Settings> = {}) {
    overlay = new Overlay(settings(options))
    overlay.start()
    await vi.advanceTimersByTimeAsync(0)
    overlay.scan()
  }

  beforeEach(() => {
    fakeBrowser.reset()
    vi.useFakeTimers({
      now: NOW,
      toFake: ["Date", "setTimeout", "clearTimeout"]
    })
    archive = [
      game({ id: "1" }),
      game({ id: "2", white: { result: "draw" }, black: { result: "draw" } })
    ]
    fetchGamesMock.mockReset().mockImplementation(async () => archive)
    recentMock.mockReset().mockImplementation(async () => archive.slice(0, 10))
    lifetimeMock.mockReset().mockResolvedValue({})
    loaderMock.mockClear()
    getJoinDateMock.mockReset().mockResolvedValue(NOW - 4000 * DAY)
    mountBoard()
  })

  afterEach(() => {
    overlay.stop()
    vi.useRealTimers()
  })

  it("shows stats for both players after one request each", async () => {
    await start()
    expect(score("top")).toBe("0/1/1")
    expect(score("bottom")).toBe("1/0/1")
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
  })

  it("never removes or refetches stats on repeated scans", async () => {
    await start()
    const element = stats("top")
    const removed: string[] = []
    new MutationObserver((records) => {
      for (const r of records)
        r.removedNodes.forEach((n) => removed.push((n as Element).className))
    }).observe(document.body, { childList: true, subtree: true })

    for (let i = 0; i < 5; i++) overlay.scan()
    await vi.advanceTimersByTimeAsync(1000)

    expect(stats("top")).toBe(element)
    expect(removed).not.toContain("ccs-stats")
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
  })

  it("puts the stats back before the next paint when chess.com replaces the row", async () => {
    await start()
    mountBoard()
    expect(stats("top")).toBeNull()
    // MutationObserver callbacks run as microtasks, i.e. before the browser paints
    await Promise.resolve()
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)))
    await vi.waitFor(() => expect(score("top")).toBe("0/1/1"), {
      timeout: 50,
      interval: 1
    })
  })

  it("re-attaches from cache when the board is flipped", async () => {
    await start()
    mountBoard({ top: "Me", bottom: "Opponent" })
    overlay.scan()
    expect(score("top")).toBe("1/0/1")
    expect(score("bottom")).toBe("0/1/1")
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
  })

  it("refreshes stale data in the background while still showing it", async () => {
    await start()
    archive = [...archive, game({ id: "3" })]
    vi.setSystemTime(NOW + STATS_CACHE_TTL_MS + 1)
    overlay.scan()
    expect(score("bottom")).toBe("1/0/1")
    await vi.advanceTimersByTimeAsync(0)
    overlay.scan()
    expect(score("bottom")).toBe("2/0/1")
  })

  /** Lets the scheduled reloads run and renders the result. */
  async function wait(ms: number) {
    await vi.advanceTimersByTimeAsync(ms)
    overlay.scan()
  }

  const delta = (side: "top" | "bottom") =>
    stats(side)?.querySelector(".ccs-delta")?.textContent

  it("loads the latest games when a game ended and shows its result briefly", async () => {
    await start()
    showGameOver("1000")
    overlay.scan()
    // nothing is counted from the page itself
    expect(score("bottom")).toBe("1/0/1")
    expect(delta("bottom")).toBeUndefined()

    archive = [game({ id: "1000", ago: 20_000 }), ...archive]
    await wait(FIRST_REFETCH)
    // one small request per player, the stats are not loaded again
    expect(recentMock).toHaveBeenCalledTimes(2)
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
    expect(score("bottom")).toBe("2/0/1")
    expect(score("top")).toBe("0/2/1")
    expect(delta("bottom")).toBe("+1W")
    expect(delta("top")).toBe("+1L")

    await wait(DELTA_VISIBLE_MS + 100)
    expect(delta("bottom")).toBeUndefined()
    // found, so nothing else is requested
    await wait(120_000)
    expect(recentMock).toHaveBeenCalledTimes(2)
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
  })

  it("tries again while the archive lags behind", async () => {
    await start()
    showGameOver("1000")
    overlay.scan()

    await wait(FIRST_REFETCH)
    expect(recentMock).toHaveBeenCalledTimes(2)
    expect(score("bottom")).toBe("1/0/1")

    archive = [
      game({
        id: "1000",
        ago: 10_000,
        white: { result: "draw" },
        black: { result: "draw" }
      }),
      ...archive
    ]
    await wait(SECOND_REFETCH)
    expect(recentMock).toHaveBeenCalledTimes(4)
    expect(score("bottom")).toBe("1/0/2")
    expect(delta("bottom")).toBe("+1D")

    await wait(120_000)
    expect(recentMock).toHaveBeenCalledTimes(4)
  })

  it("does not count a game twice once the regular refresh has it", async () => {
    await start()
    showGameOver("1000")
    overlay.scan()
    archive = [game({ id: "1000", ago: 20_000 }), ...archive]
    await wait(FIRST_REFETCH)
    expect(score("bottom")).toBe("2/0/1")

    // the regular refresh brings the same game again
    vi.setSystemTime(Date.now() + STATS_CACHE_TTL_MS + 1)
    overlay.scan()
    await wait(0)
    expect(score("bottom")).toBe("2/0/1")
  })

  it("requests nothing for a finished game that is already in the stats", async () => {
    await start()
    // e.g. clicking a game of the history
    showGameOver("1")
    overlay.scan()
    await wait(120_000)
    expect(recentMock).not.toHaveBeenCalled()
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
    expect(score("bottom")).toBe("1/0/1")
    expect(delta("bottom")).toBeUndefined()
  })

  it("never counts an old game from the history twice or at all", async () => {
    await start()
    // not among the latest games: a few small requests at most
    showGameOver("555")
    overlay.scan()
    await wait(120_000)
    const calls = 2 * GAME_END_REFETCH_DELAYS_MS.length
    expect(recentMock).toHaveBeenCalledTimes(calls)
    expect(score("bottom")).toBe("1/0/1")
    expect(delta("bottom")).toBeUndefined()

    // opened again later: no new requests
    closeGameOver()
    overlay.scan()
    showGameOver("555")
    overlay.scan()
    await wait(120_000)
    expect(recentMock).toHaveBeenCalledTimes(calls)
  })

  it("never counts a game from before the period", async () => {
    await start()
    archive = [game({ id: "900", ago: 2 * DAY }), ...archive]
    showGameOver("900")
    overlay.scan()
    await wait(120_000)
    expect(score("bottom")).toBe("1/0/1")
    expect(delta("bottom")).toBeUndefined()
  })

  it("loads the all-time records again after a game, not the all-time accuracy", async () => {
    await start()
    overlay.tooltip.open("top")
    expect(lifetimeMock).toHaveBeenCalledTimes(1)
    overlay.tooltip.close()

    archive = [game({ id: "1000", ago: 20_000 }), ...archive]
    showGameOver("1000")
    overlay.scan()
    await wait(FIRST_REFETCH)

    overlay.tooltip.open("top")
    expect(lifetimeMock).toHaveBeenCalledTimes(2)
    expect(loaderMock).toHaveBeenCalledTimes(1)
    const loader = loaderMock.mock.instances[0] as unknown as {
      start: ReturnType<typeof vi.fn>
    }
    expect(loader.start).not.toHaveBeenCalled()
  })

  it("updates the stats without a delta for a game that ended a while ago", async () => {
    await start()
    archive = [game({ id: "1000", ago: 2 * 3_600_000 }), ...archive]
    showGameOver("1000")
    overlay.scan()
    await wait(FIRST_REFETCH)
    expect(score("bottom")).toBe("2/0/1")
    expect(delta("bottom")).toBeUndefined()
  })

  it("does nothing for daily games", async () => {
    mountBoard({ url: "/game/daily/7" })
    await start()
    showGameOver()
    overlay.scan()
    await wait(120_000)
    expect(recentMock).not.toHaveBeenCalled()
  })

  it("shows special titles right before the name, in every layout", async () => {
    const title = (side: "top" | "bottom") =>
      document.querySelector(`.board-layout-${side} .ccs-title`)

    mountBoard({ top: "RobertBrot" })
    await start()
    expect(title("top")?.textContent).toBe("AFM")
    // in front of the name, chess.com's badge is hidden instead
    const name = document.querySelector(
      ".board-layout-top .cc-user-username-component"
    )!
    expect(title("top")?.parentElement).toBe(name.parentElement)
    expect(
      title("top")!.compareDocumentPosition(name) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      document.querySelector<HTMLElement>(
        ".board-layout-top .cc-user-badge-component"
      )!.style.display
    ).toBe("none")
    expect(title("bottom")).toBeNull()

    // board flipped: the title moves with the player
    mountBoard({ top: "Opponent", bottom: "robertbrot" })
    overlay.scan()
    expect(title("top")).toBeNull()
    expect(title("bottom")?.textContent).toBe("AFM")

    // compact layout: inside the row with the name
    mountBoard({ top: "RobertBrot", compact: true })
    overlay.scan()
    expect(title("top")?.parentElement?.className).toBe(
      "user-tagline-compact-row"
    )
  })

  it("keeps special titles when the stats are hidden", async () => {
    mountBoard({ top: "RobertBrot" })
    await start({ show_stats: false })
    expect(stats("top")).toBeNull()
    expect(document.querySelector(".ccs-title")?.textContent).toBe("AFM")
  })

  it("hides own stats when configured", async () => {
    await start({ hide_own_stats: true })
    expect(stats("bottom")).toBeNull()
    expect(stats("top")).not.toBeNull()
  })

  it("warns about new accounts", async () => {
    getJoinDateMock.mockImplementation(async (name) =>
      name === "Opponent" ? NOW - 10 * DAY : NOW - 4000 * DAY
    )
    await start()
    await vi.advanceTimersByTimeAsync(0)
    overlay.scan()
    expect(stats("top")!.querySelector(".ccs-age--critical")).not.toBeNull()
    expect(stats("bottom")!.querySelector(".ccs-age")).toBeNull()
  })

  it("only hides the badge when new account warnings are off", async () => {
    getJoinDateMock.mockResolvedValue(NOW - 10 * DAY)
    await start({ show_account_age: false })
    await vi.advanceTimersByTimeAsync(0)
    overlay.scan()
    expect(stats("top")!.querySelector(".ccs-age")).toBeNull()

    // the tooltip still tells when the account joined
    overlay.tooltip.open("top")
    expect(document.querySelector("#ccs-tooltip")!.textContent).toContain(
      "Joined"
    )
  })

  it("loads all-time records when the tooltip opens, the accuracy only on click", async () => {
    await start()
    expect(lifetimeMock).not.toHaveBeenCalled()
    overlay.tooltip.open("top")
    overlay.tooltip.open("top")
    expect(lifetimeMock).toHaveBeenCalledTimes(1)
    expect(loaderMock).toHaveBeenCalledTimes(1)

    const tooltip = () => document.querySelector("#ccs-tooltip")!
    const load = await vi.waitFor(() => {
      const button = tooltip().querySelector<HTMLButtonElement>(
        ".ccs-accuracy button"
      )
      expect(button?.textContent).toBe("Load")
      return button!
    })
    load.click()

    await vi.waitFor(() =>
      expect(tooltip().textContent).toContain(
        "Based on 3 analyzed games out of 8"
      )
    )
    // average of all analyzed games in the selected modes: (160 + 90) / 3
    expect(tooltip().textContent).toContain("Avg. accuracy83%")

    // the loader is kept, reopening shows the result without loading again
    overlay.tooltip.close()
    overlay.tooltip.open("top")
    expect(loaderMock).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(tooltip().textContent).toContain("Avg. accuracy83%")
    )
  })

  it("uses the games of the all-time records as archive size while loading", async () => {
    lifetimeMock.mockResolvedValue({
      blitz: { wins: 500, losses: 400, draws: 100 },
      bullet: { wins: 200, losses: 200, draws: 0 }
    })
    await start()
    overlay.tooltip.open("top")
    await vi.advanceTimersByTimeAsync(0)

    const handle = (
      overlay as unknown as {
        getAllTimeAccuracy(name: string): {
          state(): { total?: number }
        }
      }
    ).getAllTimeAccuracy("Opponent")
    const loader = loaderMock.mock.instances[0] as unknown as {
      status: string
      loaded: number
    }
    Object.assign(loader, { status: "loading", loaded: 500 })
    expect(handle.state().total).toBe(1400)

    // more games than recorded (e.g. unrated ones): no made-up total
    Object.assign(loader, { loaded: 1500 })
    expect(handle.state().total).toBeUndefined()
  })

  it("saves settings changed in the tooltip", async () => {
    await start()
    overlay.tooltip.open("top", "settings")
    const wdl = [
      ...document.querySelectorAll<HTMLButtonElement>("#ccs-tooltip button")
    ].find((b) => b.textContent === "W/D/L")!
    wdl.click()
    await vi.waitFor(async () =>
      expect(
        ((await fakeBrowser.storage.local.get("settings")).settings as Settings)
          .score_order
      ).toBe("wdl")
    )
  })

  it("refetches when the time interval changes", async () => {
    await start()
    overlay.updateSettings(settings({ time_interval: "last week" }))
    expect(fetchGamesMock).toHaveBeenCalledTimes(4)
  })

  it("does not retry failed requests in a loop", async () => {
    fetchGamesMock.mockRejectedValue(new Error("offline"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await start()
    await vi.advanceTimersByTimeAsync(5000)
    overlay.scan()
    expect(fetchGamesMock).toHaveBeenCalledTimes(2)
    expect(stats("top")).toBeNull()
  })
})
