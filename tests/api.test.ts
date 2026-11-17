import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { browser } from "wxt/browser"
import { fakeBrowser } from "wxt/testing/fake-browser"

import {
  fetchGames,
  fetchRecentGames,
  AllTimeAccuracyLoader,
  fetchLifetimeStats,
  getJoinDate,
  parseMode,
  parseResult
} from "../src/lib/api"
import { ARCHIVE_ENDPOINT } from "../src/lib/config"
import { HOUR, NOW, hydratedGame, jsonResponse, textResponse } from "./fixtures"

const DAY_MS = 86_400_000

const PROFILE = `<div class="cc-section profile-header-container" data-username="Me" data-user-id="1" data-user-uuid="uuid-me"></div>`

vi.mock("../src/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/config")>()),
  ALL_TIME_PAGE_SIZE: 2,
  ALL_TIME_PAGE_ATTEMPTS: 2
}))

describe("api", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fakeBrowser.reset()
    vi.useFakeTimers({ now: NOW, toFake: ["Date", "setTimeout"] })
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each([
    ["PLAYER_RESULT_WIN", "win"],
    ["PLAYER_RESULT_LOSE", "loss"],
    ["PLAYER_RESULT_RESIGNED", "loss"],
    ["PLAYER_RESULT_TIMEOUT", "loss"],
    ["PLAYER_RESULT_AGREED", "draw"],
    ["PLAYER_RESULT_STALEMATE", "draw"],
    ["PLAYER_RESULT_TIMEOUT_VS_INSUFFICIENT", "draw"],
    ["PLAYER_RESULT_ABORTED", undefined]
  ])("parses result %s as %s", (raw, expected) => {
    expect(parseResult(raw)).toBe(expected)
  })

  it("maps time classes to game modes", () => {
    expect(parseMode("TIME_CLASS_HYPERBULLET")).toBe("bullet")
    expect(parseMode("TIME_CLASS_CLASSICAL")).toBe("rapid")
    expect(parseMode("TIME_CLASS_DAILY")).toBeUndefined()
  })

  it("resolves the uuid, pages through the archive and stops at the interval start", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) =>
      hydratedGame({
        key: `g${i}`,
        endedAt: NOW - (i + 1) * 60_000,
        whiteAccuracy: i === 0 ? 83.1 : undefined,
        client: "LC6;chrome"
      })
    )
    const page2 = [
      hydratedGame({ key: "g50", endedAt: NOW - 2 * HOUR }),
      hydratedGame({ key: "old", endedAt: NOW - 20 * HOUR })
    ]
    fetchMock
      .mockResolvedValueOnce(textResponse(PROFILE))
      .mockResolvedValueOnce(jsonResponse({ hydratedGames: page1 }))
      .mockResolvedValueOnce(jsonResponse({ hydratedGames: page2 }))

    const games = await fetchGames("Me", NOW - 12 * HOUR)

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "https://www.chess.com/member/me",
      ARCHIVE_ENDPOINT,
      ARCHIVE_ENDPOINT
    ])
    const body = JSON.parse(fetchMock.mock.calls[2]![1].body)
    expect(body.criteria).toMatchObject({
      playerId: "uuid-me",
      page: 2,
      pageSize: 50
    })

    expect(games).toHaveLength(51)
    expect(games[0]).toEqual({
      id: "g0",
      endTime: NOW - 60_000,
      mode: "rapid",
      white: {
        username: "Me",
        result: "win",
        accuracy: 83.1,
        client: "LC6;chrome"
      },
      black: {
        username: "Opponent",
        result: "loss",
        accuracy: undefined,
        client: undefined
      }
    })
  })

  it("uses the id from game urls and loads the latest games in one request", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse(PROFILE))
      .mockResolvedValueOnce(
        jsonResponse({
          hydratedGames: [
            hydratedGame({
              key: "cf0a1a93-a199-11f1-a51b-ebd42201000f",
              legacyId: "173577557850",
              endedAt: NOW - 60_000
            })
          ]
        })
      )

    const games = await fetchRecentGames("Me")

    expect(games.map((g) => g.id)).toEqual(["173577557850"])
    const body = JSON.parse(fetchMock.mock.calls[1]![1].body)
    expect(body.criteria).toMatchObject({ page: 1, pageSize: 10 })
  })

  it("caches the uuid permanently", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse(PROFILE))
      .mockImplementation(async () => jsonResponse({ hydratedGames: [] }))

    await fetchGames("Me", 0)
    await fetchGames("me", 0)

    expect(
      fetchMock.mock.calls.filter((c) => String(c[0]).includes("/member/"))
    ).toHaveLength(1)
  })

  it("retries failed requests but not 404s", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse("", 500))
      .mockResolvedValueOnce(textResponse(PROFILE))
      .mockResolvedValueOnce(jsonResponse({ hydratedGames: [] }))
    const result = fetchGames("Me", 0)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toEqual([])

    fetchMock.mockReset().mockImplementation(async () => textResponse("", 404))
    await expect(fetchGames("ghost", 0)).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("loads the join date from the public api and caches it", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ username: "newbie", joined: 1_700_000_000 })
    )

    expect(await getJoinDate("Newbie")).toBe(1_700_000_000_000)
    expect(await getJoinDate("newbie")).toBe(1_700_000_000_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.chess.com/pub/player/newbie"
    )
  })

  it("loads all-time records per mode from the public stats endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        chess_daily: {
          last: { rating: 2239 },
          record: { win: 73, loss: 11, draw: 4 }
        },
        chess_blitz: {
          last: { rating: 1688 },
          best: { rating: 1802, date: 1_741_046_400 },
          record: { win: 230, loss: 201, draw: 19 }
        },
        chess_rapid: { record: { win: 61 } }
      })
    )

    expect(await fetchLifetimeStats("Me")).toEqual({
      blitz: {
        rating: 1688,
        peak: { rating: 1802, date: 1_741_046_400_000 },
        wins: 230,
        losses: 201,
        draws: 19
      },
      rapid: {
        rating: undefined,
        peak: undefined,
        wins: 61,
        losses: 0,
        draws: 0
      }
    })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.chess.com/pub/player/me/stats"
    )
  })

  describe("AllTimeAccuracyLoader", () => {
    // ALL_TIME_PAGE_SIZE is mocked to 2, ALL_TIME_PAGE_ATTEMPTS to 2
    const page = (games: ReturnType<typeof hydratedGame>[], total = 3) =>
      jsonResponse({ hydratedGames: games, pagination: { totalSize: total } })
    const page1 = () =>
      page([
        hydratedGame({ key: "a", endedAt: NOW - DAY_MS, whiteAccuracy: 80 }),
        hydratedGame({
          key: "b",
          endedAt: NOW - DAY_MS,
          timeClass: "TIME_CLASS_BLITZ"
        })
      ])
    const page2 = () =>
      page([
        hydratedGame({
          key: "c",
          endedAt: NOW - 400 * DAY_MS,
          whiteAccuracy: 90
        })
      ])

    it("waits for start(), then goes through the whole archive with progress", async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(page1())
        .mockResolvedValueOnce(page2())

      const loader = new AllTimeAccuracyLoader("Me")
      await loader.whenReady()
      expect(loader.status).toBe("idle")
      expect(fetchMock).not.toHaveBeenCalled()

      const progress: string[] = []
      loader.subscribe(() =>
        progress.push(`${loader.status} ${loader.loaded}/${loader.total}`)
      )
      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("done"))

      expect(progress).toEqual([
        "loading 0/undefined",
        "loading 2/3",
        "done 3/3"
      ])
      expect(loader.result.modes).toEqual({
        rapid: { sum: 170, analyzed: 2, games: 2 },
        blitz: { sum: 0, analyzed: 0, games: 1 }
      })
      const body = JSON.parse(fetchMock.mock.calls[2]![1].body)
      expect(body.criteria).toMatchObject({ page: 2, pageSize: 2 })
    })

    it("counts a game only once when a new game moves it onto the next page", async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(page1())
        // a game ended in between: "b" is now the first game of page 2
        .mockResolvedValueOnce(
          page([
            hydratedGame({
              key: "b",
              endedAt: NOW - DAY_MS,
              timeClass: "TIME_CLASS_BLITZ"
            }),
            hydratedGame({
              key: "c",
              endedAt: NOW - 400 * DAY_MS,
              whiteAccuracy: 90
            })
          ])
        )
        .mockResolvedValueOnce(page([]))

      const loader = new AllTimeAccuracyLoader("Me")
      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("done"))
      expect(loader.result.modes).toEqual({
        rapid: { sum: 170, analyzed: 2, games: 2 },
        blitz: { sum: 0, analyzed: 0, games: 1 }
      })
    })

    it("keeps the results of loaders that finish at the same time", async () => {
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        if (!url.startsWith(ARCHIVE_ENDPOINT)) return textResponse(PROFILE)
        const { username } = JSON.parse(String(init!.body)).criteria
        return page([
          hydratedGame({ key: username, endedAt: NOW, white: username })
        ])
      })

      const me = new AllTimeAccuracyLoader("Me")
      const you = new AllTimeAccuracyLoader("You")
      await Promise.all([me.whenReady(), you.whenReady()])
      // slow reads: both saves would read the cache before either writes it
      const get = browser.storage.local.get.bind(browser.storage.local)
      vi.spyOn(browser.storage.local, "get").mockImplementation(
        async (...args: Parameters<typeof get>) => {
          const snapshot = structuredClone(await get(...args))
          if (args[0] === "accuracy")
            await new Promise((r) => setTimeout(r, 10))
          return snapshot
        }
      )
      me.start()
      you.start()
      await vi.waitFor(() => {
        expect(me.status).toBe("done")
        expect(you.status).toBe("done")
      })
      await vi.waitFor(async () => {
        const { accuracy } = await fakeBrowser.storage.local.get("accuracy")
        expect(Object.keys(accuracy as object).sort()).toEqual(["me", "you"])
      })
    })

    it("drops a total that turns out to be smaller than the archive", async () => {
      // e.g. a totalSize that only counts the current page
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(
          page(
            [
              hydratedGame({ key: "a", endedAt: NOW - DAY_MS }),
              hydratedGame({ key: "b", endedAt: NOW - DAY_MS })
            ],
            2
          )
        )
        .mockResolvedValueOnce(
          page([hydratedGame({ key: "c", endedAt: NOW - DAY_MS })], 2)
        )

      const loader = new AllTimeAccuracyLoader("Me")
      const totals: (number | undefined)[] = []
      loader.subscribe(() => totals.push(loader.total))
      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("done"))
      // 2 after the first page, then dropped once 3 games were loaded
      expect(totals).toContain(2)
      expect(loader.total).toBe(3)
    })

    it("knows the archive size of results saved by older versions", async () => {
      await fakeBrowser.storage.local.set({
        accuracy: {
          me: {
            modes: {
              blitz: { sum: 8000, analyzed: 100, games: 9000 },
              rapid: { sum: 1700, analyzed: 20, games: 3000 }
            },
            fetchedAt: NOW - DAY_MS
          }
        }
      })
      const loader = new AllTimeAccuracyLoader("Me")
      await loader.whenReady()
      expect(loader.status).toBe("done")
      expect(loader.loaded).toBe(12000)

      // and an update shows progress against it right away
      fetchMock.mockReturnValue(new Promise(() => {}))
      loader.reload()
      expect(loader.total).toBe(12000)
      loader.stop()
    })

    it("keeps a loaded result until it is updated, without any request", async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(page1())
        .mockResolvedValueOnce(page2())
      const first = new AllTimeAccuracyLoader("Me")
      first.start()
      await vi.waitFor(() => expect(first.status).toBe("done"))
      fetchMock.mockClear()

      const cached = new AllTimeAccuracyLoader("me")
      await cached.whenReady()
      expect(cached.status).toBe("done")
      // the archive size is restored too (e.g. for the update question)
      expect(cached.loaded).toBe(3)
      expect(cached.result.modes.rapid).toEqual({
        sum: 170,
        analyzed: 2,
        games: 2
      })
      expect(fetchMock).not.toHaveBeenCalled()

      // no expiry: only reload() loads it again
      vi.setSystemTime(NOW + 30 * 24 * 3_600_000)
      const later = new AllTimeAccuracyLoader("Me")
      await later.whenReady()
      expect(later.status).toBe("done")
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("loads everything again on reload instead of adding to the old result", async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(page1())
        .mockResolvedValueOnce(page2())
      const loader = new AllTimeAccuracyLoader("Me")
      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("done"))

      // game "c" got analyzed in the meantime with a different accuracy
      fetchMock.mockReset()
      fetchMock.mockResolvedValueOnce(page1()).mockResolvedValueOnce(
        page([
          hydratedGame({
            key: "c",
            endedAt: NOW - 400 * DAY_MS,
            whiteAccuracy: 70
          })
        ])
      )
      const progress: string[] = []
      loader.subscribe(() =>
        progress.push(`${loader.status} ${loader.loaded}/${loader.total}`)
      )
      loader.reload()
      await vi.waitFor(() => expect(loader.status).toBe("done"))

      // the archive size counted last time gives real progress right away
      expect(progress).toEqual(["loading 0/3", "loading 2/3", "done 3/3"])
      expect(loader.loaded).toBe(3)
      expect(loader.result.modes.rapid).toEqual({
        sum: 150,
        analyzed: 2,
        games: 2
      })
      expect(
        JSON.parse(fetchMock.mock.calls[0]![1].body).criteria
      ).toMatchObject({ page: 1 })
    })

    it("keeps retrying while chess.com doesn't answer", async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(page1())
        .mockImplementation(async () => textResponse("", 503))

      const loader = new AllTimeAccuracyLoader("Me")
      const retrying: boolean[] = []
      loader.subscribe(() => retrying.push(loader.retrying))
      loader.start()
      // far longer than the old limit: it must still be loading
      await vi.advanceTimersByTimeAsync(10 * 60_000)
      expect(loader.status).toBe("loading")
      expect(retrying).toContain(true)

      fetchMock.mockImplementation(async () => page2())
      await vi.advanceTimersByTimeAsync(60_000)
      expect(loader.status).toBe("done")
      expect(loader.retrying).toBe(false)
      expect(loader.result.modes.rapid).toEqual({
        sum: 170,
        analyzed: 2,
        games: 2
      })
    })

    it("can be stopped and resumes at the same page without counting twice", async () => {
      let answerPage2!: () => void
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(page1())
        .mockImplementationOnce(
          () =>
            new Promise<Response>(
              (resolve) => (answerPage2 = () => resolve(page2()))
            )
        )
        .mockImplementation(async () => page2())

      const loader = new AllTimeAccuracyLoader("Me")
      loader.start()
      await vi.waitFor(() => expect(loader.loaded).toBe(2))
      loader.stop()
      expect(loader.status).toBe("stopped")

      // the answer for page 2 arrives after stop() and is dropped
      answerPage2()
      await vi.advanceTimersByTimeAsync(0)
      expect(loader.loaded).toBe(2)

      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("done"))
      expect(loader.loaded).toBe(3)
      expect(loader.result.modes.rapid).toEqual({
        sum: 170,
        analyzed: 2,
        games: 2
      })
      expect(
        JSON.parse(fetchMock.mock.calls.at(-1)![1].body).criteria.page
      ).toBe(2)
    })

    it("fails right away on unexpected data instead of waiting", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {})
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(textResponse("not json"))

      const loader = new AllTimeAccuracyLoader("Me")
      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("failed"))
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("skips archive entries without game data", async () => {
      fetchMock
        .mockResolvedValueOnce(textResponse(PROFILE))
        .mockResolvedValueOnce(
          page(
            [
              hydratedGame({
                key: "a",
                endedAt: NOW - DAY_MS,
                whiteAccuracy: 80
              }),
              { game: { key: "broken" } } as unknown as ReturnType<
                typeof hydratedGame
              >
            ],
            2
          )
        )
        .mockResolvedValueOnce(page([], 2))

      const loader = new AllTimeAccuracyLoader("Me")
      loader.start()
      await vi.waitFor(() => expect(loader.status).toBe("done"))
      expect(loader.loaded).toBe(2)
      expect(loader.result.modes.rapid).toEqual({
        sum: 80,
        analyzed: 1,
        games: 1
      })
    })
  })
})
