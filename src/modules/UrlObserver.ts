import { StatsUpdater } from "./StatsUpdater";

/**
 * MutationObserver for observing URL changes
 */
export class UrlObserver {
  private statsUpdater: StatsUpdater;
  private mutationObserver: MutationObserver | null;
  private prevPathname: string;
  private timeout: number;

  /**
   * Constructor for UrlObserver
   *
   * @param {StatsUpdater} statsUpdater - The StatsUpdater instance to be used.
   * @param {number} timeout - Timeout in milliseconds to wait before updating stats.
   * @constructor
   */
  constructor(statsUpdater: StatsUpdater, timeout: number) {
    this.statsUpdater = statsUpdater;
    this.prevPathname = window.location.pathname;
    this.mutationObserver = null;
    this.timeout = timeout;
  }

  /**
   * Handle a mutation event.
   *
   * @param {MutationRecord[]} mutationsList - A list of MutationRecord objects.
   * @returns {void}
   */
  private handleMutation(mutationsList: MutationRecord[]): void {
    for (const mutation of mutationsList) {
      if (mutation.type !== "childList" && mutation.type !== "attributes")
        continue;

      const currentPathname = window.location.pathname;
      if (currentPathname === this.prevPathname) continue;
      this.prevPathname = currentPathname;

      // Update stats after a timeout
      setTimeout(
        () => this.statsUpdater.updateStatsForBothPlayers(),
        this.timeout
      );
    }
  }

  /**
   * Start observing URL changes.
   *
   * @returns {void}
   */
  public startObserving(): void {
    if (this.mutationObserver) return;

    this.mutationObserver = new MutationObserver(
      (mutationsList: MutationRecord[]) => this.handleMutation(mutationsList)
    );

    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  }

  /**
   * Stop observing URL changes.
   *
   * @returns {void}
   */
  public stopObserving(): void {
    if (!this.mutationObserver) return;

    this.mutationObserver.disconnect();
    this.mutationObserver = null;
  }
}
