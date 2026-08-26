import { expect } from "chai"
import sinon from "sinon"

import { StatsUpdater } from "../src/modules/StatsUpdater"
import { StatsUpdaterFactory } from "../src/modules/StatsUpdaterFactory"
import { UiUpdater } from "../src/modules/UiUpdater"
import { SettingsManager } from "../src/modules/SettingsManager"
import { APIHandler } from "../src/modules/APIHandler"
import { StatsCalculator } from "../src/modules/StatsCalculator"

import { MockSettingsStorage } from "./mocks/MockSettingsStorage"

import {
  Settings,
  SettingsJSON,
  GameMode,
  TimeInterval
} from "../src/types/settings"
import { Stats } from "../src/types/stats"

import settingsData from "../settings.json" with { type: "json" }
import { MockUiWindow } from "./mocks/MockUiWindow"

const { defaultSettings } = settingsData as SettingsJSON

const now = Math.floor(Date.now() / 1000)

const lightningGame = {
  end_time: now - 60,
  time_class: "lightning",
  white: {
    username: "Kugelbuch",
    result: "win"
  },
  black: {
    username: "Opponent",
    result: "lose"
  }
} as const

const standardGame = {
  end_time: now - 60,
  time_class: "standard",
  white: {
    username: "Kugelbuch",
    result: "win"
  },
  black: {
    username: "Opponent",
    result: "lose"
  }
} as const

const testData = [
  {
    un: "Kugelbuch",
    gameModes: ["bullet", "blitz", "rapid", "daily"],
    timeInterval: "today"
  },
  {
    un: "Kugelbuch",
    gameModes: ["rapid"],
    timeInterval: "last month"
  },
  {
    un: "Kugelbuch",
    gameModes: ["bullet", "blitz", "rapid", "daily"],
    timeInterval: "last week"
  },
  {
    un: "DanielNaroditsky",
    gameModes: ["bullet", "blitz", "rapid", "daily"],
    timeInterval: "today"
  }
]

describe("StatsUpdater", () => {
  let statsUpdater: StatsUpdater
  let uiUpdater: UiUpdater
  let settingsManager: SettingsManager
  let apiHandler: APIHandler
  let statsCalculator: StatsCalculator
  let settingsJSON: SettingsJSON
  let mockUiWindow: MockUiWindow

  beforeEach(async () => {
    mockUiWindow = new MockUiWindow()
    await mockUiWindow.initialize()

    statsUpdater = StatsUpdaterFactory.createStatsUpdaterForTest(
      new MockSettingsStorage(),
      mockUiWindow
    )
    uiUpdater = statsUpdater.getUiUpdater()
    settingsManager = statsUpdater.getSettingsManager()
    apiHandler = statsUpdater.getApiHandler()
    statsCalculator = statsUpdater.getStatsCalculator()
    settingsJSON = settingsManager.getSettingsJSON()
  })

  it("should initialize correctly with dependencies", () => {
    statsUpdater.initialize(false, false, false)

    expect(uiUpdater).to.be.an.instanceof(UiUpdater)
    expect(settingsManager).to.be.an.instanceof(SettingsManager)
    expect(apiHandler).to.be.an.instanceof(APIHandler)
    expect(statsCalculator).to.be.an.instanceof(StatsCalculator)
    expect(settingsJSON).to.be.an("object")
  })

  it("should initialize with default settings", async () => {
    statsUpdater.initialize(false, false, false)

    const settings: Settings = await settingsManager.getSettings()

    expect(settings).to.deep.equal(defaultSettings)
  })

  it("should get correct stats for various players", async () => {
    statsUpdater.initialize(false, false, false)

    const settings: Settings = await settingsManager.getSettings()

    const validateStats = async (
      un: string,
      gameModes: GameMode[],
      timeInterval: TimeInterval
    ) => {
      const stats: Stats = await statsUpdater.getStats(
        Math.random() > 0.5 ? "top" : "bottom",
        un,
        gameModes,
        timeInterval
      )

      expect(stats).to.be.an("object")
      expect(stats).to.have.property("wld")
      expect(stats).to.have.property("accuracy")

      const { wld, accuracy } = stats

      expect(wld).to.be.an("object")
      expect(wld).to.have.property("wins").to.be.a("number")
      expect(wld).to.have.property("loses").to.be.a("number")
      expect(wld).to.have.property("draws").to.be.a("number")
      expect(wld).to.have.property("games").to.be.a("number")

      expect(accuracy).to.be.an("object")
      expect(accuracy).to.have.property("avg").to.be.a("number")
      expect(accuracy).to.have.property("wld").to.be.an("object")

      const { wins, loses, draws, games } = wld

      //TODO add tests for wld of accuracy games

      expect(wins).to.be.at.least(0)
      expect(loses).to.be.at.least(0)
      expect(draws).to.be.at.least(0)
      expect(games).to.equal(wins + loses + draws)

      expect(accuracy.avg).to.be.at.least(0)
      expect(accuracy.wld.games).to.be.at.most(games)
    }

    testData.push({
      un: "DanielNaroditsky",
      gameModes: settings.game_modes,
      timeInterval: settings.time_interval
    })

    for (const data of testData) {
      await validateStats(
        data.un,
        data.gameModes as GameMode[],
        data.timeInterval as TimeInterval
      )
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
  })

  it("should map chess.com time classes to addon game modes", () => {
    const stats = statsCalculator.calculateStats(
      [lightningGame as never, standardGame as never],
      ["bullet", "rapid"],
      "today",
      "Kugelbuch"
    )

    expect(stats.wld).to.deep.equal({
      wins: 2,
      loses: 0,
      draws: 0,
      games: 2
    })
  })

  it("should throw username not found error with empty mock dom", async () => {
    statsUpdater.initialize(false, false, false)

    try {
      await statsUpdater.updateStatsForPlayer("top", false)
    } catch (error) {
      expect(error).to.equal("No username found for side top")
    }

    try {
      await statsUpdater.updateStatsForPlayer("bottom", false)
    } catch (error) {
      expect(error).to.equal("No username found for side bottom")
    }
  })

  it("should defer refresh after flip button clicks", async () => {
    const clock = sinon.useFakeTimers()

    try {
      mockUiWindow.getDocument().body.innerHTML =
        '<button id="board-controls-flip"></button>'

      ;(
        statsUpdater as never as {
          attachButtonClickEvent: (buttonId: string) => void
        }
      ).attachButtonClickEvent("board-controls-flip")

      let flipped = false
      const getUsernameStub = sinon
        .stub(uiUpdater, "getUsername")
        .callsFake((player: "top" | "bottom") =>
          flipped
            ? player === "top"
              ? "BottomPlayer"
              : "TopPlayer"
            : player === "top"
              ? "TopPlayer"
              : "BottomPlayer"
        )
      const updateStatsStub = sinon.stub(
        statsUpdater,
        "updateStatsForBothPlayers"
      )
      const updateTitleStub = sinon.stub(
        statsUpdater,
        "updateTitleForBothPlayers"
      )

      setTimeout(() => {
        flipped = true
      }, 50)

      mockUiWindow.getDocument().getElementById("board-controls-flip")?.click()

      expect(updateStatsStub.called).to.equal(false)
      expect(updateTitleStub.called).to.equal(false)

      await clock.tickAsync(49)

      expect(updateStatsStub.called).to.equal(false)
      expect(updateTitleStub.called).to.equal(false)

      await clock.tickAsync(1)

      expect(updateStatsStub.calledOnce).to.equal(true)
      expect(updateTitleStub.calledOnce).to.equal(true)

      getUsernameStub.restore()
      updateStatsStub.restore()
      updateTitleStub.restore()
    } finally {
      clock.restore()
    }
  })
})
