import { expect } from "chai"
import sinon from "sinon"

import settingsData from "../settings.json" with { type: "json" }

import { APIHandler } from "../src/modules/APIHandler"
import { SettingsJSON } from "../src/types/settings"

describe("APIHandler", () => {
  let apiHandler: APIHandler
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    apiHandler = new APIHandler(settingsData as SettingsJSON)
    fetchStub = sinon.stub(globalThis, "fetch")
  })

  afterEach(() => {
    fetchStub.restore()
  })

  it("builds the extended archive url for a specific page", () => {
    expect(apiHandler.buildUrl("Kugelbuch", 2)).to.equal(
      "https://www.chess.com/callback/games/extended-archive?locale=en_US&username=kugelbuch&page=2"
    )
  })

  it("loads additional pages until the oldest game leaves the selected interval", async () => {
    const now = Math.floor(Date.now() / 1000)

    const pageOneResponse = {
      data: [
        { end_time: now - 60 * 60 * 24, uuid: "page-1-game-1" },
        { end_time: now - 60 * 60 * 24 * 3, uuid: "page-1-game-2" }
      ],
      meta: {
        totalCount: 3,
        countPerPage: 2,
        totalPages: 2,
        currentPage: 1
      }
    }

    const pageTwoResponse = {
      data: [{ end_time: now - 60 * 60 * 24 * 10, uuid: "page-2-game-1" }],
      meta: {
        totalCount: 3,
        countPerPage: 1,
        totalPages: 2,
        currentPage: 2
      }
    }

    fetchStub
      .onFirstCall()
      .resolves({ json: async () => pageOneResponse } as Response)
    fetchStub
      .onSecondCall()
      .resolves({ json: async () => pageTwoResponse } as Response)

    const data = await apiHandler.fetchChessData("Kugelbuch", "last week")

    expect(fetchStub.callCount).to.equal(2)
    expect(data.games).to.have.length(3)
    expect(data.games.map((game) => game.uuid)).to.deep.equal([
      "page-1-game-1",
      "page-1-game-2",
      "page-2-game-1"
    ])
  })
})
