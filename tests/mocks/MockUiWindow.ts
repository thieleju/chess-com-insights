import { UiWindow } from "../../src/types/wrapper"

/**
 * Mock implementation of the UiWindow interface using JSDOM.
 */
export class MockUiWindow implements UiWindow {
  private window: Window & typeof globalThis

  private document: Document

  protected dom: string = "<!doctype html><html><body></body></html>"

  protected domOptions: Record<string, string | number | boolean> = {
    url: "https://chess.com/",
    referrer: "https://chess.com/",
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000
  }

  /**
   * Initializes the JSDOM instance and assigns the window and document properties.
   * JSDOM is lazy loaded to avoid putting it in production build.
   */
  async initialize() {
    const { JSDOM } = await import("jsdom")
    const dom = new JSDOM(this.dom, this.domOptions)

    this.window = dom.window as unknown as Window & typeof globalThis
    this.document = dom.window.document
  }

  /**
   * Returns the mock Window object.
   *
   * @returns {Window} The mock Window object.
   */
  getWindow(): Window {
    if (!this.window) throw new Error("Window not initialized")
    return this.window
  }

  /**
   * Returns the Document object associated with the mock Window.
   *
   * @returns {Document} The Document object.
   */
  getDocument(): Document {
    if (!this.document) throw new Error("Document not initialized")
    return this.document
  }
}
