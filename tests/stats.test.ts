import { describe, expect, it } from "vitest"

import {
  accountAge,
  calculateStats,
  formatAge,
  parseDevice
} from "../src/lib/stats"
import { DAY, NOW, game } from "./fixtures"

const ALL = ["bullet", "blitz", "rapid"] as const

describe("calculateStats", () => {
  it("counts wins, losses and draws from the player's perspective", () => {
    const stats = calculateStats(
      [
        game({}),
        game({
          white: { username: "Opponent", result: "win" },
          black: { username: "me", result: "loss" }
        }),
        game({ white: { result: "draw" }, black: { result: "draw" } })
      ],
      "ME",
      [...ALL]
    )
    expect(stats).toMatchObject({ wins: 1, losses: 1, draws: 1, games: 3 })
  })

  it("only includes the selected modes and ignores unknown results", () => {
    const stats = calculateStats(
      [
        game({ mode: "bullet" }),
        game({ mode: "rapid" }),
        game({ mode: undefined }),
        game({ white: { result: undefined } })
      ],
      "Me",
      ["bullet"]
    )
    expect(stats.games).toBe(1)
  })

  it("averages accuracy over analyzed games only", () => {
    const stats = calculateStats(
      [
        game({ white: { accuracy: 80 } }),
        game({ white: { accuracy: 91, result: "loss" } }),
        game({})
      ],
      "Me",
      [...ALL]
    )
    expect(stats.accuracy).toBe(86)
    expect(stats.analyzedGames).toBe(2)
  })

  it("has no accuracy without analyzed games", () => {
    expect(calculateStats([game({})], "Me", [...ALL]).accuracy).toBeUndefined()
  })

  it("takes the device from the newest game, even outside the selected modes", () => {
    const stats = calculateStats(
      [
        game({
          mode: "bullet",
          white: { client: "Chesscom-iOS/4.10 (iPhone; iOS 26.6)" }
        }),
        game({ white: { client: "LC6;chrome/151.0.0/browser;Windows 10" } })
      ],
      "Me",
      ["blitz"]
    )
    expect(stats.device?.platform).toBe("phone")
  })
})

describe("parseDevice", () => {
  it("describes desktop clients", () => {
    expect(parseDevice("LC6;chrome/151.0.0/browser;Windows 10")).toEqual({
      platform: "pc",
      details: "Windows 10 · chrome/151.0.0/browser"
    })
  })

  it("describes phones", () => {
    expect(parseDevice("Chesscom-iOS/4.10.24 (iPhone; iOS 26.6)")).toEqual({
      platform: "phone",
      details: "iPhone · iOS 26.6"
    })
  })
})

describe("accountAge", () => {
  it.each([
    [0, "critical"],
    [29, "critical"],
    [30, "warning"],
    [89, "warning"],
    [90, undefined],
    [4000, undefined]
  ])("an account that is %i days old is %s", (days, level) => {
    expect(accountAge(NOW - days * DAY - 1000, NOW)).toEqual({ days, level })
  })
})

describe("formatAge", () => {
  it.each([
    [0, "today"],
    [1, "1 day"],
    [12, "12 days"],
    [59, "59 days"],
    [61, "2 months"],
    [400, "13 months"],
    [800, "2 years"],
    [4400, "12 years"]
  ])("formats %i days as %s", (days, text) => {
    expect(formatAge(days)).toBe(text)
  })
})
