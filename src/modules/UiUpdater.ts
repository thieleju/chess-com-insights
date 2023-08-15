import { SettingsJSON } from "../types/settings"
import { Stats } from "../types/stats"

/**
 * Utility class for updating UI elements with chess statistics.
 */
export class UiUpdater {
  private color_wins: string
  private color_loses: string
  private color_draws: string

  /**
   * Create a UiUpdater instance.
   *
   * @param {SettingsJSON} settingsJSON - The settings in JSON format.
   */
  constructor(settingsJSON: SettingsJSON) {
    this.color_wins = settingsJSON.colors.wins
    this.color_loses = settingsJSON.colors.loses
    this.color_draws = settingsJSON.colors.draws
  }

  /**
   * Update an HTML element with chess statistics.
   *
   * @param {HTMLElement} el - The HTML element to be updated.
   * @param {Stats} stats - A statistics object containing chess statistics.
   * @param {boolean} showAccuracy - A flag indicating whether accuracy information should be displayed.
   * @param {boolean} colorHighlighting - A flag indicating whether color highlighting should be applied to the statistics.
   * @returns {void}
   */
  updateElement(
    el: HTMLElement,
    stats: Stats,
    showAccuracy: boolean,
    colorHighlighting: boolean
  ): void {
    let str

    if (colorHighlighting) {
      str =
        `<strong>` +
        `<span style="color: ${this.color_wins}">${stats.wld.wins}</span>/` +
        `<span style="color: ${this.color_loses}">${stats.wld.loses}</span>/` +
        `<span style="color: ${this.color_draws}">${stats.wld.draws}</span>` +
        `</strong>`
    } else {
      str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`
    }

    if (stats.accuracy.avg !== 0 && showAccuracy) {
      str += ` (${stats.accuracy.avg}%)`
    }

    el.innerHTML = str
  }

  /**
   * Create an info element for displaying chess statistics.
   *
   * @param {string} className - Class name for the info element.
   * @param {string} id - ID attribute for the info element.
   * @returns {HTMLElement} A newly created info element.
   */
  createInfoElement(className: string, id: string): HTMLElement {
    const infoEl = document.createElement("div")
    infoEl.classList.add("user-tagline-rating", className)
    infoEl.id = id
    infoEl.style.marginLeft = "10px"
    return infoEl
  }
}
