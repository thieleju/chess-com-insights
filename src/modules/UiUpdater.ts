import { SettingsJSON } from "../types/settings"
import { Stats } from "../types/stats"
import { UiWindow } from "../types/wrapper"

/**
 * Utility class for updating UI elements with chess statistics.
 */
export class UiUpdater {
  private color_wins: string
  private color_loses: string
  private color_draws: string

  private query_selectors: {
    target_top: string
    target_bottom: string
    target_name: string
  }

  private uiWindow: UiWindow

  /**
   * Create a UiUpdater instance.
   *
   * @param {SettingsJSON} settingsJSON - The settings in JSON format.
   * @param {UiWindow} uiWindow - The window object for the UI.
   */
  constructor(settingsJSON: SettingsJSON, uiWindow: UiWindow) {
    this.color_wins = settingsJSON.colors.wins
    this.color_loses = settingsJSON.colors.loses
    this.color_draws = settingsJSON.colors.draws

    this.query_selectors = settingsJSON.query_selectors

    this.uiWindow = uiWindow
  }

  /**
   * Update an HTML element with chess statistics.
   *
   * @param {("top" | "bottom")} side - The player ("top" or "bottom") for whom to update the element.
   * @param {Stats} stats - A statistics object containing chess statistics.
   * @param {boolean} showAccuracy - A flag indicating whether accuracy information should be displayed.
   * @param {boolean} colorHighlighting - A flag indicating whether color highlighting should be applied to the statistics.
   * @returns {void}
   */
  updateElement(
    side: "top" | "bottom",
    stats: Stats,
    showAccuracy: boolean,
    colorHighlighting: boolean,
    timeInterval: string
  ): HTMLElement {
    const el = this.getInfoElement(side)

    let str: string = ``

    if (colorHighlighting) {
      str =
        `<strong>` +
        `<span style="color: ${this.color_wins}">${stats.wld.wins}</span>/` +
        `<span style="color: ${this.color_loses}">${stats.wld.loses}</span>/` +
        `<span style="color: ${this.color_draws}">${stats.wld.draws}</span>` +
        `</strong>`
    } else str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`

    if (stats.accuracy.avg !== 0 && showAccuracy)
      str += ` (${stats.accuracy.avg}%)`

    el.innerHTML = str

    this.addTooltipToStatsElement(el, side, stats, timeInterval)

    return el
  }

  /**
   * Adds a tooltip to a given HTML element when the mouse enters it.
   *
   * @param {HTMLElement} el - The HTML element to which the tooltip will be added.
   * @param {"top" | "bottom"} side - The side of the element where the tooltip should appear.
   * @param {Stats} stats - The statistics object containing accuracy and game data.
   * @param {string} timeInterval - The time interval for which the accuracy is displayed.
   * @returns {void}
   */
  addTooltipToStatsElement(
    el: HTMLElement,
    side: "top" | "bottom",
    stats: Stats,
    timeInterval: string
  ): void {
    // add event to stats element
    el.addEventListener("mouseenter", () => {
      // create tooltip element
      const tooltip = document.createElement("div")
      tooltip.classList.add(
        "user-popover-component",
        "user-popover-popover",
        "user-username-component",
        "user-tagline-username"
      )

      this.uiWindow.getDocument().body.appendChild(tooltip)

      const { wins, loses, draws, games } = stats.accuracy.wld

      tooltip.innerHTML =
        stats.accuracy.avg === 0
          ? `<span style="padding-bottom:5px"> \
               No accuracy data available (${timeInterval}) \
               <br>\
               Accuracy is only available on analyzed rated games \
             </span>`
          : `<span style="padding-bottom:5px"> \
               <strong>Average accuracy of ${stats.accuracy.avg}%</strong> (${timeInterval}) \
             </span> \
             <span> \
               Accuracy based on ${games} out of ${stats.wld.games} games  \
               <br> \
               W/L/D of analyzed games: ${wins}/${loses}/${draws} \
             </span>`

      tooltip.style.position = "absolute"
      tooltip.style.padding = "10px"
      tooltip.style.width = `auto`
      tooltip.style.maxWidth = `fit-content`

      const { left, top, height } = el.getBoundingClientRect()

      tooltip.style.left = `${left}px`
      tooltip.style.top =
        side === "bottom"
          ? `${top - tooltip.getBoundingClientRect().height}px`
          : `${top + height}px`

      el.addEventListener("mouseleave", () => tooltip.remove())
    })
  }

  /**
   * Create an info element for displaying chess statistics.
   *
   * @param {string} className - Class name for the info element.
   * @param {string} id - ID attribute for the info element.
   * @returns {HTMLElement} A newly created info element.
   */
  createInfoElement(className: string, id: string): HTMLElement {
    const infoEl = this.uiWindow.getDocument().createElement("div")
    infoEl.classList.add("user-tagline-rating", className)
    infoEl.id = id
    infoEl.style.marginLeft = "10px"
    return infoEl
  }

  /**
   * Retrieves the player element for a specific player.
   *
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to retrieve the player element.
   * @returns {HTMLElement | null} The player element for the player, or null if not found.
   */
  getPlayerElement(player: "top" | "bottom"): HTMLElement | null {
    const target_top = this.query_selectors.target_top
    const target_bottom = this.query_selectors.target_bottom
    const target_name = this.query_selectors.target_name

    return this.uiWindow
      .getDocument()
      .querySelector(
        player === "top"
          ? `.${target_top} .${target_name}`
          : `.${target_bottom} .${target_name}`
      ) as HTMLElement
  }

  /**
   * Removes the info element for a specific player.
   *
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to remove the info element.
   */
  removeInfoElement(player: "top" | "bottom"): void {
    const info_el_id = `info-el-${player}`
    const info_el = this.uiWindow.getDocument().getElementById(info_el_id)
    if (info_el) info_el.remove()
  }

  /**
   * Retrieves the info element for a specific player.
   *
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to retrieve the info element.
   * @returns {HTMLElement} The info element for the player.
   */
  getInfoElement(player: "top" | "bottom"): HTMLElement {
    const info_el_id = `info-el-${player}`
    let info_el = this.uiWindow.getDocument().getElementById(info_el_id)

    if (!info_el) {
      info_el = this.createInfoElement(
        player === "top" ? "flag-1" : "flag-2",
        info_el_id
      )
      const player_el = this.getPlayerElement(player)
      player_el?.parentElement?.appendChild(info_el)
    }

    return info_el
  }

  /**
   * Retrieves the username of a specific player.
   *
   * @private
   * @param {("top" | "bottom")} player - The player ("top" or "bottom") for whom to retrieve the username.
   * @returns {string} The username of the player.
   */
  getUsername(player: "top" | "bottom"): string {
    const target_top = this.query_selectors.target_top
    const target_bottom = this.query_selectors.target_bottom
    const target_name = this.query_selectors.target_name

    const player_el = this.uiWindow
      .getDocument()
      .querySelector(
        player === "top"
          ? `.${target_top} .${target_name}`
          : `.${target_bottom} .${target_name}`
      ) as HTMLElement

    return player_el?.innerText || ""
  }

  /**
   * Retrieves the flag element for a specific player.
   *
   * @param {("top" | "bottom")} side - The player ("top" or "bottom") for whom to retrieve the flag element.
   * @returns {HTMLElement} The flag element for the player
   */
  getFlagElement(side: "top" | "bottom"): HTMLElement {
    return this.uiWindow
      .getDocument()
      .querySelector(side === "top" ? ".flag-1" : ".flag-2") as HTMLElement
  }
}
