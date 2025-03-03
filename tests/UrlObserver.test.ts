import { expect } from "chai"

import { UrlObserver } from "../src/modules/UrlObserver"

import { MockUiWindow } from "./mocks/MockUiWindow"

describe("UrlObserver", () => {
  let urlObserver: UrlObserver
  let mockUiWindow: MockUiWindow

  before(async () => {
    mockUiWindow = new MockUiWindow()
    await mockUiWindow.initialize()
    urlObserver = new UrlObserver(mockUiWindow)
  })

  it("should initialize correctly", () => {
    expect(urlObserver).to.be.an.instanceof(UrlObserver)
  })
})
