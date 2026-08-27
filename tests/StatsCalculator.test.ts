import { expect } from "chai"
import sinon from "sinon"
import { DateTime } from "luxon"

import { StatsCalculator } from "../src/modules/StatsCalculator"

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

  it("keeps games in the rolling six hour interval", () => {
    const now = Math.floor(Date.now() / 1000)
    const legacyGame = {
      gameTimeClass: "lightning",
      gameEndTime: now - 60 * 60 * 2,
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
      "last 6 hours"
    )

    expect(filteredGames).to.have.lengthOf(1)
  })

  it("uses the latest client info and ignores missing accuracy metadata", () => {
    const now = Math.floor(Date.now() / 1000)

    const games = [
      {
        end_time: now - 60,
        time_class: "rapid",
        white: {
          username: "Kugelbuch",
          result: "win",
          "@id": "1",
          uuid: "1",
          rating: 1200,
          client: "Chesscom-iOS/4.10.24.24677 (iPhone; iOS 26.6)"
        },
        black: {
          username: "Opponent",
          result: "lose",
          "@id": "2",
          uuid: "2",
          rating: 1200,
          client: "LC6;chrome/151.0.0/browser;Windows 10"
        },
        accuracies: {
          white: null,
          black: null
        }
      },
      {
        end_time: now - 120,
        time_class: "blitz",
        white: {
          username: "Kugelbuch",
          result: "win",
          "@id": "3",
          uuid: "3",
          rating: 1200,
          client: "LC6;chrome/151.0.0/browser;Windows 10"
        },
        black: {
          username: "Opponent",
          result: "lose",
          "@id": "4",
          uuid: "4",
          rating: 1200,
          client: "Chesscom-iOS/4.10.24.24677 (iPhone; iOS 26.6)"
        },
        accuracies: {
          white: 80,
          black: null
        }
      }
    ]

    const stats = statsCalculator.calculateStats(
      games as never,
      ["bullet", "blitz", "rapid"],
      "last 6 hours",
      "Kugelbuch"
    )

    expect(stats.accuracy.avg).to.equal(80)
    expect(stats.accuracy.wld.games).to.equal(1)
    expect(stats.device?.platform).to.equal("phone")
    expect(stats.device?.icon).to.equal("mdi-cellphone")
    expect(stats.device?.summary).to.equal("Player last played on phone")
  })
})
