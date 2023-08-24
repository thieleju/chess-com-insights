import { expect } from "chai"
// import sinon from "sinon"
// import jsdomGlobal from "jsdom-global"

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

import settingsData from "../settings.json" assert { type: "json" }
import { MockUiWindow } from "./mocks/MockUiWindow"

const { defaultSettings } = settingsData

describe("StatsUpdater", () => {
  let statsUpdater: StatsUpdater
  let uiUpdater: UiUpdater
  let settingsManager: SettingsManager
  let apiHandler: APIHandler
  let statsCalculator: StatsCalculator
  let settingsJSON: SettingsJSON

  beforeEach(async () => {
    const mockUiWindow: MockUiWindow = new MockUiWindow()
    await mockUiWindow.initialize()
    statsUpdater = StatsUpdaterFactory.createStatsUpdaterForTest(
      new MockSettingsStorage(defaultSettings),
      mockUiWindow
    )
    uiUpdater = statsUpdater.getUiUpdater()
    settingsManager = statsUpdater.getSettingsManager()
    apiHandler = statsUpdater.getApiHandler()
    statsCalculator = statsUpdater.getStatsCalculator()
    settingsJSON = settingsManager.getSettingsJSON()
  })

  it("should initialize correctly with dependencies", () => {
    statsUpdater.initialize(false, false)

    expect(uiUpdater).to.be.an.instanceof(UiUpdater)
    expect(settingsManager).to.be.an.instanceof(SettingsManager)
    expect(apiHandler).to.be.an.instanceof(APIHandler)
    expect(statsCalculator).to.be.an.instanceof(StatsCalculator)
    expect(settingsJSON).to.be.an("object")
  })

  it("should initialize with default settings", async () => {
    statsUpdater.initialize(false, false)

    const settings: Settings = await settingsManager.getSettings()

    expect(settings).to.deep.equal(defaultSettings)
  })

  it("should get correct stats for a player", async () => {
    statsUpdater.initialize(false, false)

    const settings: Settings = await settingsManager.getSettings()

    const validateStats = async (
      un: string,
      gameModes: GameMode[],
      timeInterval: TimeInterval
    ) => {
      const stats: Stats = await statsUpdater.getUpdateStats(
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
      expect(accuracy).to.have.property("games").to.be.a("number")

      const { wins, loses, draws, games } = wld

      expect(wins).to.be.at.least(0)
      expect(loses).to.be.at.least(0)
      expect(draws).to.be.at.least(0)
      expect(games).to.equal(wins + loses + draws)

      expect(accuracy.avg).to.be.at.least(0)
      expect(accuracy.games).to.be.at.most(games)
    }

    const testData = [
      {
        un: "Kugelbuch",
        gameModes: ["bullet", "blitz", "rapid", "daily"],
        timeInterval: "this month"
      },
      {
        un: "Kugelbuch",
        gameModes: ["rapid"],
        timeInterval: "this month"
      },
      {
        un: "Kugelbuch",
        gameModes: ["bullet", "blitz", "rapid", "daily"],
        timeInterval: "last week"
      },
      {
        un: "DanielNaroditsky",
        gameModes: ["bullet", "blitz", "rapid", "daily"],
        timeInterval: "this month"
      },
      {
        un: "DanielNaroditsky",
        gameModes: settings.game_modes,
        timeInterval: settings.time_interval
      }
    ]

    for (const data of testData) {
      await validateStats(
        data.un,
        data.gameModes as GameMode[],
        data.timeInterval as TimeInterval
      )
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
  })
})
