import { expect } from "chai"
import sinon from "sinon"
import { DateTime } from "luxon"

import settingsData from "../settings.json" with { type: "json" }

import { StatsCalculator } from "../src/modules/StatsCalculator"
import { SettingsJSON } from "../src/types/settings"

const settingsJSON = settingsData as SettingsJSON

describe("StatsCalculator", () => {
  let statsCalculator: StatsCalculator
  let nowStub: sinon.SinonStub

  beforeEach(() => {
    statsCalculator = new StatsCalculator()

    const fixedNow = DateTime.local(2026, 8, 26, 20, 0).toMillis()
    nowStub = sinon.stub(Date, "now").returns(fixedNow)
  })

  afterEach(() => {
    nowStub.restore()
  })

  it("keeps legacy same-day games in the filter for today", () => {
    const legacyGame = {
      gameTimeClass: "lightning",
      gameEndTime: "Aug 26, 2026",
      user1: {
        username: "Opponent"
      },
      user2: {
        username: "Alex-11211"
      },
      user1Result: 0,
      user2Result: 1,
      user1Accuracy: null,
      user2Accuracy: null
    }

    const filteredGames = statsCalculator.filterGames(
      [legacyGame as never],
      ["bullet"],
      "today"
    )

    expect(filteredGames).to.have.lengthOf(1)
  })
})
