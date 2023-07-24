import { update_stats_both } from "./utils";

/**
 * MutationObserver for observing URL changes
 * @param targetTop The top username element
 * @param targetBottom The bottom username element
 * @returns A MutationObserver object
 */
export class UrlObserver {
  private prevPathname: string;
  private mutationObserver: MutationObserver | null;
  private timeout: number;

  /**
   * Constructor for UrlObserver
   * @param timeout Timeout in milliseconds to wait before updating stats
   */
  constructor(timeout: number) {
    this.prevPathname = window.location.pathname;
    this.mutationObserver = null;
    this.timeout = timeout;
  }

  /**
   * Handle a mutation event
   * @param mutationsList A list of MutationRecord objects
   */
  private handleMutation(mutationsList: MutationRecord[]): void {
    for (const mutation of mutationsList) {
      if (mutation.type !== "childList" && mutation.type !== "attributes")
        continue;

      const currentPathname = window.location.pathname;
      if (currentPathname === this.prevPathname) continue;
      this.prevPathname = currentPathname;

      // Update stats after a timeout
      setTimeout(() => update_stats_both(), this.timeout);

      // console.log("URL changed:", currentPathname);
    }
  }

  /**
   * Start observing URL changes
   */
  public startObserving(): void {
    if (this.mutationObserver) return;

    this.mutationObserver = new MutationObserver((mutationsList) =>
      this.handleMutation(mutationsList)
    );

    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  }

  /**
   * Stop observing URL changes
   */
  public stopObserving(): void {
    if (!this.mutationObserver) return;

    this.mutationObserver.disconnect();
    this.mutationObserver = null;
  }
}
