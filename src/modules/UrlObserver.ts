/**
 * MutationObserver for observing URL changes.
 */
export class UrlObserver {
  private eventListeners: { [event: string]: ((...args: any[]) => void)[] } = {}
  private mutationObserver: MutationObserver | null
  private prevPathname: string
  private window: Window
  private document: Document

  /**
   * Constructor for UrlObserver.
   */
  constructor(w?: Window, d?: Document) {
    this.window = w ? w : window
    this.document = d ? d : document

    this.prevPathname = this.window.location.pathname
    this.mutationObserver = null
  }

  /**
   * Attach an event listener for the specified event.
   *
   * @param {string} event - The event name.
   * @param {Function} listener - The event listener function.
   * @returns {void}
   */
  on(event: string, listener: (...args: any[]) => void): void {
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
  private emit(event: string, ...args: any[]): void {
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

      const currentPathname = this.window.location.pathname
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

    this.mutationObserver.observe(this.document.documentElement, {
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
