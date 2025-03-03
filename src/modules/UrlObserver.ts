import { UiWindow } from "../types/wrapper"

/**
 * MutationObserver for observing URL changes.
 */
export class UrlObserver {
  private eventListeners: {
    [event: string]: ((...args: unknown[]) => void)[]
  } = {}
  private mutationObserver: MutationObserver | null
  private prevPathname: string

  private uiWindow: UiWindow

  /**
   * Constructor for UrlObserver.
   */
  constructor(uiWindow: UiWindow) {
    this.uiWindow = uiWindow
    this.prevPathname = this.uiWindow.getWindow().location.pathname
    this.mutationObserver = null
  }

  /**
   * Attach an event listener for the specified event.
   *
   * @param {string} event - The event name.
   * @param {Function} listener - The event listener function.
   * @returns {void}
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push(listener)
  }

  /**
   * Emit an event to notify listeners.
   *
   * @private
   * @param {string} event - The event name.
   * @param {any[]} args - Arguments to pass to the listeners.
   * @returns {void}
   */
  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners[event]
    if (listeners) {
      for (const listener of listeners) {
        listener(...args)
      }
    }
  }

  /**
   * Handle a mutation event.
   *
   * @private
   * @param {MutationRecord[]} mutationsList - A list of MutationRecord objects.
   * @returns {void}
   */
  private handleMutation(mutationsList: MutationRecord[]): void {
    for (const mutation of mutationsList) {
      if (mutation.type !== "childList" && mutation.type !== "attributes")
        continue

      const currentPathname = this.uiWindow.getWindow().location.pathname
      if (currentPathname === this.prevPathname) continue
      this.prevPathname = currentPathname

      this.emit("url-mutation")
    }
  }

  /**
   * Start observing URL changes.
   *
   * @public
   * @returns {void}
   */
  public startObserving(): void {
    if (this.mutationObserver) return

    this.mutationObserver = new MutationObserver(
      (mutationsList: MutationRecord[]) => this.handleMutation(mutationsList)
    )

    this.mutationObserver.observe(this.uiWindow.getDocument().documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"]
    })
  }

  /**
   * Stop observing URL changes.
   *
   * @public
   * @returns {void}
   */
  public stopObserving(): void {
    if (!this.mutationObserver) return

    this.mutationObserver.disconnect()
    this.mutationObserver = null
  }
}
