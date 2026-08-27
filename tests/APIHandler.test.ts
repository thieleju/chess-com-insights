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

  it("builds the archive url for a specific page", () => {
    expect(apiHandler.buildUrl("Kugelbuch", 2)).to.equal(
      "https://www.chess.com/service/player-game-archive-v2/chesscom.game_gateway.v2.GameGatewayService/HydrateGamesByCriteria?username=kugelbuch&page=2"
    )
  })

  it("resolves the player uuid and loads additional pages until the selected interval is exhausted", async () => {
    const now = Math.floor(Date.now() / 1000)
    const profileHtml = `
      <div class="cc-section profile-header-container" data-username="Kugelbuch" data-user-id="123" data-user-uuid="uuid-123"></div>
    `

    const pageOneResponse = {
      hydratedGames: [
        {
          game: {
            key: "page-1-game-1",
            endedAt: new Date((now - 60 * 60) * 1000).toISOString(),
            timeClass: "TIME_CLASS_RAPID",
            chessGame: {
              whitePlayer: {
                result: "PLAYER_RESULT_WIN",
                finalRating: 1000,
                client: "Chesscom-iOS/4.10.24.24677 (iPhone; iOS 26.6)",
                displayName: "Kugelbuch"
              },
              blackPlayer: {
                result: "PLAYER_RESULT_LOSE",
                finalRating: 1000,
                client: "LC6;chrome/151.0.0/browser;Windows 10",
                displayName: "Opponent"
              }
            }
          },
          analysisMetadata: {
            whitePlayerMetadata: { accuracy: 83.1 },
            blackPlayerMetadata: null
          }
        },
        {
          game: {
            key: "page-1-game-2",
            endedAt: new Date((now - 60 * 60 * 13) * 1000).toISOString(),
            timeClass: "TIME_CLASS_BLITZ",
            chessGame: {
              whitePlayer: {
                result: "PLAYER_RESULT_WIN",
                finalRating: 1000,
                client: "LC6;chrome/151.0.0/browser;Windows 10",
                displayName: "Opponent"
              },
              blackPlayer: {
                result: "PLAYER_RESULT_LOSE",
                finalRating: 1000,
                client: "Chesscom-iOS/4.10.24.24677 (iPhone; iOS 26.6)",
                displayName: "Kugelbuch"
              }
            }
          },
          analysisMetadata: {
            whitePlayerMetadata: null,
            blackPlayerMetadata: null
          }
        }
      ],
      pagination: {
        totalSize: 2,
        pageSize: 50,
        currentPage: 1
      }
    }

    fetchStub
      .onFirstCall()
      .resolves({ ok: true, text: async () => profileHtml } as Response)
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => pageOneResponse
    } as Response)

    const data = await apiHandler.fetchChessData("Kugelbuch", "last 12 hours")

    expect(fetchStub.callCount).to.equal(2)
    expect(fetchStub.firstCall.args[0]).to.equal(
      "https://www.chess.com/member/kugelbuch"
    )
    expect(fetchStub.secondCall.args[0]).to.equal(
      "https://www.chess.com/service/player-game-archive-v2/chesscom.game_gateway.v2.GameGatewayService/HydrateGamesByCriteria"
    )
    expect(data.games).to.have.length(1)
    expect(data.games[0].uuid).to.equal("page-1-game-1")
    expect(data.games[0].white.username).to.equal("Kugelbuch")
    expect(data.games[0].white.client).to.include("Chesscom-iOS")
    expect(data.games[0].accuracies?.white).to.equal(83.1)
    expect(data.games[0].accuracies?.black).to.equal(undefined)
    expect(data.games[0].time_class).to.equal("rapid")
  })
})
