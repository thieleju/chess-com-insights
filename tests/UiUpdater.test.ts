import { expect } from "chai"

import { UiUpdater } from "../src/modules/UiUpdater"
import { MockUiWindow } from "./mocks/MockUiWindow"

import { SettingsJSON } from "../src/types/settings"
import { Stats } from "../src/types/stats"

import settingsData from "../settings.json" assert { type: "json" }

const settingsJSON: SettingsJSON = settingsData as SettingsJSON

describe("UiUpdater", () => {
  let uiUpdater: UiUpdater
  let mockUiWindow: MockUiWindow

  before(async () => {
    mockUiWindow = new MockUiWindow()
    await mockUiWindow.initialize()
    uiUpdater = new UiUpdater(settingsJSON, mockUiWindow)
  })

  it("should update an HTML element with chess statistics", async () => {
    const stats: Stats = {
      wld: { wins: 10, loses: 5, draws: 3, games: 18 },
      accuracy: { avg: 75, games: 11 }
    }

    settingsJSON.colors = {
      wins: "#6b9438",
      loses: "#bc403a",
      draws: "#b38235"
    }

    const el = mockUiWindow.getDocument().createElement("div")

    uiUpdater.updateElement(el, stats, true, true)

    const expectedStr =
      `<strong>` +
      `<span style="color: ${settingsJSON.colors.wins}">${stats.wld.wins}</span>/` +
      `<span style="color: ${settingsJSON.colors.loses}">${stats.wld.loses}</span>/` +
      `<span style="color: ${settingsJSON.colors.draws}">${stats.wld.draws}</span>` +
      `</strong> (${stats.accuracy.avg}%)`

    expect(el.innerHTML).to.equal(expectedStr)
  })

  it("should create an info element for displaying chess statistics", () => {
    const className = "flag-1"
    const id = "info-el-top"

    const infoEl = uiUpdater.createInfoElement(className, id)

    expect(infoEl.classList.contains(className)).to.be.true
    expect(infoEl.classList.contains("user-tagline-rating")).to.be.true
    expect(infoEl.id).to.equal(id)
    expect(infoEl.style.marginLeft).to.equal("10px")
  })

  it("should get the created info element", () => {
    const infoElTop = uiUpdater.getInfoElement("top")

    expect(infoElTop.classList.contains("flag-1")).to.be.true
    expect(infoElTop.classList.contains("user-tagline-rating")).to.be.true
    expect(infoElTop.id).to.equal("info-el-top")
    expect(infoElTop.style.marginLeft).to.equal("10px")

    const infoElBottom = uiUpdater.getInfoElement("bottom")

    expect(infoElBottom.classList.contains("flag-2")).to.be.true
    expect(infoElBottom.classList.contains("user-tagline-rating")).to.be.true
    expect(infoElBottom.id).to.equal("info-el-bottom")
    expect(infoElBottom.style.marginLeft).to.equal("10px")
  })
})
