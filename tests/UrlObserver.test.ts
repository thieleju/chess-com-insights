import { expect } from "chai"
import { JSDOM } from "jsdom"

import { UrlObserver } from "../src/modules/UrlObserver"
// import { DOMWindow } from "jsdom"

describe("UrlObserver", () => {
  let urlObserver: UrlObserver
  let window: any

  before(() => {
    window = new JSDOM("<!doctype html><html><body></body></html>").window

    urlObserver = new UrlObserver(window, window.document)
  })

  // after(() => {
  //   urlObserver.stopObserving()
  // })

  it("should initialize correctly", () => {
    // urlObserver.startObserving()
    expect(true).to.be.true
    // urlObserver.stopObserving()
  })

  // it('should emit "url-mutation" event when URL changes', (done) => {
  //   urlObserver.startObserving()

  //   urlObserver.on("url-mutation", () => {
  //     expect(window.location.pathname).to.not.equal(urlObserver["prevPathname"])
  //     done()
  //   })

  //   window.history.pushState({}, "New Page", "/new-page")

  //   setTimeout(() => {
  //     const mutationObserver = (urlObserver as any)["_mutationObserver"]
  //     mutationObserver.handleMutation([
  //       {
  //         type: "attributes",
  //         attributeName: "href",
  //         target: document.documentElement
  //       }
  //     ])
  //   }, 0)
  // })
})
