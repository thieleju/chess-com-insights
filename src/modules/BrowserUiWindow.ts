import { UiWindow } from "../types/wrapper"

/**
 * Class representing a browser UI window.
 * Implements the UiWindow interface.
 */
export class BrowserUiWindow implements UiWindow {
  private window: Window = window
  private document: Document = document

  /**
   * Initializes the BrowserUiWindow window and document properties.
   */
  constructor() {
    this.window = window
    this.document = document
  }

  /**
   * Get the browser window object.
   * @returns {Window} The browser window object.
   */
  getWindow(): Window {
    return this.window
  }

  /**
   * Get the browser document object.
   * @returns {Document} The browser document object.
   */
  getDocument(): Document {
    return this.document
  }
}
