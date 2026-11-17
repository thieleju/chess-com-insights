import { beforeEach, describe, expect, it } from "vitest"

import {
  getGameId,
  getGameOver,
  getStatsParent,
  getUsername,
  isDailyGame
} from "../src/content/dom"
import { mountBoard, showGameOver } from "./fixtures"

describe("dom", () => {
  beforeEach(() => mountBoard())

  it("reads usernames in the normal layout", () => {
    expect(getUsername("top")).toBe("Opponent")
    expect(getUsername("bottom")).toBe("Me")
    expect(getStatsParent("top")?.className).toBe("user-tagline-component")
  })

  it("reads usernames in the compact layout", () => {
    mountBoard({ compact: true })
    expect(getUsername("top")).toBe("Opponent")
    expect(getStatsParent("top")?.className).toBe("player-tagline")
  })

  it("returns nothing while the players aren't rendered yet", () => {
    document.body.innerHTML = ""
    expect(getUsername("top")).toBe("")
    expect(getStatsParent("top")).toBeNull()
  })

  it("finds the game-over modal and the game id from its review link", () => {
    expect(getGameOver()).toBeUndefined()
    showGameOver("187375940398")
    expect(getGameOver()).toEqual({ gameId: "187375940398" })
  })

  it("takes the game id from the url if the modal has no link", () => {
    showGameOver()
    expect(getGameOver()).toEqual({ gameId: "1000" })
    mountBoard({ url: "/play/online" })
    showGameOver()
    expect(getGameOver()).toEqual({ gameId: undefined })
  })

  it("parses game ids from the url", () => {
    expect(
      getGameId(
        new URL("https://www.chess.com/game/live/123") as unknown as Location
      )
    ).toBe("123")
    expect(
      getGameId(
        new URL("https://www.chess.com/game/456") as unknown as Location
      )
    ).toBe("456")
    expect(
      getGameId(
        new URL("https://www.chess.com/play/online") as unknown as Location
      )
    ).toBeUndefined()
    expect(
      isDailyGame(
        new URL("https://www.chess.com/game/daily/7") as unknown as Location
      )
    ).toBe(true)
  })
})
