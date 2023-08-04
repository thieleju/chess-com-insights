import { Stats } from "../types/stats"

import { colors } from "../../settings.json"

/**
 * Utility class for updating UI elements with chess statistics.
 */
export class UiUpdater {
  /**
   * Aktualisiert ein HTML-Element mit Schachstatistiken.
   *
   * @param {HTMLElement} el - Das HTML-Element, das aktualisiert werden soll.
   * @param {Object} stats - Ein Statistik-Objekt mit Schachstatistiken.
   * @param {boolean} showAccuracy - Ein Flag, das angibt, ob Genauigkeitsinformationen angezeigt werden sollen.
   * @param {boolean} colorHighlighting - Ein Flag, das angibt, ob Farbhervorhebung auf die Statistiken angewendet werden soll.
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
        `<span style="color: ${colors.wins}">${stats.wld.wins}</span>/` +
        `<span style="color: ${colors.loses}">${stats.wld.loses}</span>/` +
        `<span style="color: ${colors.draws}">${stats.wld.draws}</span>` +
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
