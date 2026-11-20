import type { LifetimeStats, ModeRecord } from "../lib/api"
import {
  MEMBER_URL,
  RELOAD_CONFIRM_GAMES,
  TOOLTIP_CLOSE_DELAY_MS,
  TOOLTIP_DELAY_MS
} from "../lib/config"
import type { Settings } from "../lib/settings"
import { formatAge } from "../lib/stats"
import type { Side } from "../content/dom"
import {
  ICONS,
  MODE_ICONS,
  capitalize,
  el,
  icon,
  orderedScore,
  plural,
  scoreLabel,
  scoreText
} from "./el"
import {
  DEVICE_LABEL,
  deviceIcon,
  findStatsElement,
  type StatsElement,
  type StatsView
} from "./pill"
import { createSettingsForm } from "./settings-form"

export interface AccuracyState {
  status: "idle" | "loading" | "stopped" | "failed" | "done"
  retrying?: boolean
  loaded: number
  total?: number
  accuracy?: number
  analyzed: number
  games: number
}

export interface AccuracyHandle {
  ready: Promise<void>
  state(): AccuracyState
  start(): void
  stop(): void
  reload(): void
  subscribe(listener: () => void): () => void
}

export interface TooltipDeps {
  lifetime(username: string): Promise<LifetimeStats>
  allTimeAccuracy(username: string): AccuracyHandle
  settings(): Settings
  saveSettings(settings: Settings): void
}

interface AllTimeSection {
  key: string
  section: HTMLElement
  records: HTMLElement
  request: number
  cleanup: () => void
}

/**
 * The popover shown when hovering the stats
 */
export class Tooltip {
  private bound = new WeakSet<HTMLElement>()
  private element?: HTMLElement
  private side?: Side
  private mode: "stats" | "settings" = "stats"
  private pinned = false
  private renderedKey?: string
  private allTime?: AllTimeSection
  private openTimer?: ReturnType<typeof setTimeout>
  private closeTimer?: ReturnType<typeof setTimeout>

  constructor(
    private deps: TooltipDeps,
    private doc: Document = document
  ) {}

  bind(root: StatsElement): void {
    if (this.bound.has(root)) return
    this.bound.add(root)
    root.addEventListener("mouseenter", () => {
      clearTimeout(this.closeTimer)
      const side = root.dataset.side as Side
      if (this.element && this.side === side) return
      clearTimeout(this.openTimer)
      this.openTimer = setTimeout(() => this.open(side), TOOLTIP_DELAY_MS)
    })
    root.addEventListener("mouseleave", () => {
      clearTimeout(this.openTimer)
      this.scheduleClose()
    })

    root.tabIndex = 0
    root.setAttribute("role", "button")
    root.setAttribute("aria-label", "Show stats details")
    root.addEventListener("click", (event) => {
      // don't trigger chess.com's own handlers on the player row
      event.preventDefault()
      event.stopPropagation()
      this.togglePinned(root.dataset.side as Side)
    })
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      this.togglePinned(root.dataset.side as Side)
    })
  }

  get isPinned(): boolean {
    return !!this.element && this.pinned
  }

  /** A click pins the tooltip open, a second click closes it. */
  togglePinned(side: Side): void {
    clearTimeout(this.openTimer)
    clearTimeout(this.closeTimer)
    if (this.element && this.side === side) {
      if (this.pinned) this.close()
      else this.pinned = true
      return
    }
    this.open(side)
    this.pinned = !!this.element
  }

  get isOpen(): boolean {
    return !!this.element
  }

  open(side: Side, mode: "stats" | "settings" = "stats"): void {
    const anchor = findStatsElement(side, this.doc)
    if (!anchor?.ccsView) return
    this.close()
    this.side = side
    this.mode = mode

    const element = el("div", "ccs-tooltip ccs-panel")
    element.id = "ccs-tooltip"
    element.setAttribute("role", "dialog")
    element.addEventListener("mouseenter", () => clearTimeout(this.closeTimer))
    element.addEventListener("mouseleave", () => this.scheduleClose())
    this.element = element
    this.doc.body.appendChild(element)

    this.doc.addEventListener("pointerdown", this.onPointerDown, true)
    this.doc.addEventListener("keydown", this.onKeyDown, true)
    this.doc.defaultView?.addEventListener("scroll", this.position, true)
    this.render(anchor.ccsView)
  }

  close(): void {
    this.dropAllTime()
    clearTimeout(this.openTimer)
    clearTimeout(this.closeTimer)
    this.element?.remove()
    this.element = undefined
    this.side = undefined
    this.pinned = false
    this.renderedKey = undefined
    this.doc.removeEventListener("pointerdown", this.onPointerDown, true)
    this.doc.removeEventListener("keydown", this.onKeyDown, true)
    this.doc.defaultView?.removeEventListener("scroll", this.position, true)
  }

  /** Called after every render of a side; refreshes the open tooltip if its data changed. */
  update(side: Side): void {
    if (!this.element || this.side !== side) return
    const view = findStatsElement(side, this.doc)?.ccsView
    if (!view) return this.close()
    if (this.mode === "stats" && JSON.stringify(view) !== this.renderedKey)
      this.render(view)
    else this.position()
  }

  private scheduleClose(): void {
    // pinned tooltips and the settings view only close on an outside click or Escape
    if (this.pinned || this.mode === "settings") return
    clearTimeout(this.closeTimer)
    this.closeTimer = setTimeout(() => this.close(), TOOLTIP_CLOSE_DELAY_MS)
  }

  private onPointerDown = (event: Event) => {
    const target = event.target as Node
    const anchor = this.side && findStatsElement(this.side, this.doc)
    if (!this.element?.contains(target) && !anchor?.contains(target))
      this.close()
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.close()
  }

  private render(view: StatsView): void {
    if (!this.element) return
    this.renderedKey = JSON.stringify(view)
    this.element.replaceChildren(
      ...(this.mode === "settings"
        ? this.settingsContent()
        : this.statsContent(view))
    )
    this.position()
  }

  position = (): void => {
    const anchor = this.side && findStatsElement(this.side, this.doc)
    if (!this.element || !anchor) return
    const view = this.doc.defaultView!
    const rect = anchor.getBoundingClientRect()
    const { height, width } = this.element.getBoundingClientRect()
    const gap = 8
    const fitsAbove = rect.top - height - gap > 0
    const fitsBelow = rect.bottom + height + gap < view.innerHeight
    const above =
      this.side === "bottom" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove
    this.element.style.top = `${Math.max(gap, above ? rect.top - height - gap : rect.bottom + gap)}px`
    this.element.style.left = `${Math.max(gap, Math.min(rect.left, view.innerWidth - width - gap))}px`
  }

  // -------------------------------------------------------------------------
  // Views

  private statsContent(view: StatsView): HTMLElement[] {
    const { stats, settings } = view
    const order = settings.score_order

    const settingsButton = el("button", "ccs-icon-button", icon(ICONS.settings))
    settingsButton.type = "button"
    settingsButton.title = "Settings"
    settingsButton.setAttribute("aria-label", "Open settings")
    settingsButton.addEventListener("click", () => {
      this.mode = "settings"
      this.render(view)
    })

    const profileLink = el("a", "ccs-icon-button", icon(ICONS.external))
    profileLink.href =
      MEMBER_URL + encodeURIComponent(view.username.toLowerCase())
    profileLink.target = "_blank"
    profileLink.rel = "noopener noreferrer"
    profileLink.title = "Open profile in new tab"
    profileLink.setAttribute(
      "aria-label",
      `Open the profile of ${view.username} in a new tab`
    )

    const recent = el(
      "section",
      "ccs-section",
      el(
        "div",
        "ccs-section-title",
        el("span", undefined, capitalize(settings.time_interval)),
        el("span", "ccs-muted", plural(stats.games, "game"))
      )
    )
    if (stats.games > 0) recent.append(resultBar(stats))
    recent.append(row(scoreLabel(order), scoreText(stats, order)))
    recent.append(
      row(
        accuracyLabel(),
        stats.accuracy !== undefined ? `${stats.accuracy}%` : "–"
      ),
      el(
        "div",
        "ccs-muted ccs-small",
        stats.games === 0
          ? "Only analyzed games have accuracy data"
          : stats.analyzedGames === 0
            ? `None of the ${plural(stats.games, "game")} were analyzed`
            : analyzedNote(stats.analyzedGames, stats.games)
      )
    )

    const content = [
      el(
        "header",
        "ccs-header",
        el("strong", "ccs-title-text", view.username),
        profileLink,
        settingsButton
      ),
      recent,
      this.lifetimeSection(view)
    ]

    const extra = el("section", "ccs-section")
    if (stats.device)
      extra.append(
        row(
          "Device",
          el(
            "span",
            "ccs-mode",
            deviceIcon(stats.device.platform),
            DEVICE_LABEL[stats.device.platform]
          )
        ),
        // the whole width below (aligned right, under the device), so long
        // details don't push the row apart
        el(
          "div",
          "ccs-muted ccs-small ccs-device-details",
          stats.device.details
        )
      )
    if (view.age) {
      const joined = new Date(view.age.joined).toLocaleDateString("en-US", {
        dateStyle: "medium"
      })
      const age = formatAge(view.age.days)
      const relative = view.age.days < 1 ? age : `${age} ago`
      extra.append(row("Joined", `${joined} · ${relative}`))
      if (view.age.level)
        content.splice(
          1,
          0,
          el(
            "div",
            `ccs-callout ccs-callout--${view.age.level}`,
            el("strong", undefined, "New account"),
            el("span", undefined, `Joined ${relative}`)
          )
        )
    }
    if (extra.childElementCount) content.push(extra)
    return content
  }

  /**
   * The "All time" section is kept across re-renders of the tooltip
   */
  private lifetimeSection(view: StatsView): HTMLElement {
    const key = JSON.stringify([
      view.username.toLowerCase(),
      view.settings.game_modes,
      view.settings.score_order
    ])
    if (this.allTime?.key !== key) {
      this.dropAllTime()
      this.allTime = this.createAllTime(view, key)
    }
    this.loadRecords(view, this.allTime)
    return this.allTime.section
  }

  private createAllTime(view: StatsView, key: string): AllTimeSection {
    const records = loading(3)
    const accuracy = loading(1)
    accuracy.classList.add("ccs-accuracy")
    const section = el(
      "section",
      "ccs-section",
      el("div", "ccs-section-title", el("span", undefined, "All time")),
      records,
      accuracy
    )

    // the accuracy may take a while for players with many games, so it shows
    // up on its own, independent of the records
    let active = true
    const handle = this.deps.allTimeAccuracy(view.username)
    const renderAccuracy = () => {
      if (!active) return
      renderAccuracyInto(accuracy, handle)
      this.position()
    }
    const unsubscribe = handle.subscribe(renderAccuracy)
    // a result loaded before shows up right away, without a click
    void handle.ready.then(renderAccuracy)

    return {
      key,
      section,
      records,
      request: 0,
      cleanup: () => {
        active = false
        unsubscribe()
      }
    }
  }

  private loadRecords(view: StatsView, allTime: AllTimeSection): void {
    const request = ++allTime.request
    const { records } = allTime
    const order = view.settings.score_order
    this.deps
      .lifetime(view.username)
      .then((lifetime) => {
        if (request !== allTime.request) return
        const modes = view.settings.game_modes.filter((m) => lifetime[m])
        const total = { wins: 0, losses: 0, draws: 0 }
        const rows = modes.map((mode) => {
          const record = lifetime[mode]!
          total.wins += record.wins
          total.losses += record.losses
          total.draws += record.draws
          // the rating (and peak) in a small line below the mode, so long
          // records still fit next to it; icon and record centered to both
          const name = el("span", "ccs-mode-name", capitalize(mode))
          if (record.rating) name.append(ratingText(record))
          const label = el(
            "span",
            "ccs-mode-label",
            icon(MODE_ICONS[mode], `ccs-mode-icon ccs-mode-icon--${mode}`),
            name
          )
          return row(label, scoreText(record, order))
        })
        if (modes.length > 1)
          rows.push(
            row(
              el("strong", undefined, "Total"),
              el("strong", undefined, scoreText(total, order))
            )
          )
        loaded(
          records,
          rows.length ? rows : [el("div", "ccs-muted", "No rated games")]
        )
      })
      .catch(() => {
        // keep records that were shown before
        if (request !== allTime.request || !records.matches(".is-loading"))
          return
        loaded(records, [
          el("div", "ccs-muted", "Could not load all-time stats")
        ])
      })
      .finally(() => this.position())
  }

  private dropAllTime(): void {
    this.allTime?.cleanup()
    this.allTime = undefined
  }

  private settingsContent(): HTMLElement[] {
    const back = el("button", "ccs-icon-button", icon(ICONS.back))
    back.type = "button"
    back.title = "Back"
    back.setAttribute("aria-label", "Back to stats")
    back.addEventListener("click", () => {
      this.mode = "stats"
      const view = this.side && findStatsElement(this.side, this.doc)?.ccsView
      if (view) this.render(view)
    })
    return [
      el(
        "header",
        "ccs-header",
        back,
        el("strong", "ccs-title-text", "Settings")
      ),
      createSettingsForm(this.deps.settings(), (settings) =>
        this.deps.saveSettings(settings)
      )
    ]
  }
}

function row(label: string | Node, value: string | Node): HTMLElement {
  return el(
    "div",
    "ccs-row",
    el("span", "ccs-muted", label),
    el("span", "ccs-value", value)
  )
}

function resultBar(score: {
  wins: number
  losses: number
  draws: number
}): HTMLElement {
  const bar = el("div", "ccs-bar")
  bar.setAttribute("aria-hidden", "true")
  for (const part of orderedScore(score, "wdl")) {
    if (!part.value) continue
    const segment = el("span", `ccs-bar-${part.key}`)
    segment.style.flexGrow = String(part.value)
    bar.append(segment)
  }
  return bar
}

function loading(lines: number): HTMLElement {
  const body = el("div", "ccs-lifetime is-loading")
  for (let i = 0; i < lines; i++) body.append(el("div", "ccs-skeleton"))
  body.setAttribute("aria-busy", "true")
  return body
}

function loaded(body: HTMLElement, children: HTMLElement[]): void {
  body.classList.remove("is-loading")
  body.removeAttribute("aria-busy")
  body.replaceChildren(...children)
}

/** "1688 · peak 1802" with the date of the peak on hover, or just "1688". */
function ratingText({ rating, peak }: ModeRecord): HTMLElement {
  const text = el(
    "span",
    "ccs-rating ccs-small",
    peak ? `${rating} · peak ${peak.rating}` : String(rating)
  )
  if (peak?.date)
    text.title = `Peak on ${new Date(peak.date).toLocaleDateString("en-US", {
      dateStyle: "medium"
    })}`
  return text
}

function accuracyLabel(): HTMLElement {
  const hint = "Accuracy is only available for analyzed games"
  const info = el("span", "ccs-info", icon(ICONS.info))
  info.title = hint
  info.setAttribute("role", "img")
  info.setAttribute("aria-label", hint)
  return el("span", "ccs-label", "Avg. accuracy", info)
}

function analyzedNote(analyzed: number, games: number): string {
  const count = analyzed.toLocaleString("en-US")
  return `Based on ${count} out of ${games.toLocaleString("en-US")} ${games === 1 ? "game" : "games"}`
}

/**
 * Renders all-time accuracy
 */
function renderAccuracyInto(
  container: HTMLElement,
  handle: AccuracyHandle
): void {
  const state = handle.state()
  const withProgress = state.status === "loading" || state.status === "stopped"
  if (withProgress && container.dataset.status === state.status) {
    updateProgress(container, state)
    return
  }
  container.dataset.status = state.status
  loaded(container, accuracyContent(state, handle))
  if (withProgress) updateProgress(container, state)
}

function accuracyContent(
  state: AccuracyState,
  handle: AccuracyHandle
): HTMLElement[] {
  const value = state.accuracy !== undefined ? `${state.accuracy}%` : "–"

  if (state.status === "done") {
    const summary = !state.games
      ? "No rated games"
      : state.analyzed
        ? analyzedNote(state.analyzed, state.games)
        : `None of the ${plural(state.games, "game")} were analyzed`
    const footer = el("div", "ccs-row ccs-row--footer")
    const showSummary = () =>
      footer.replaceChildren(
        el("div", "ccs-muted ccs-small", summary),
        button("Update", "Load all games again", () =>
          state.loaded >= RELOAD_CONFIRM_GAMES ? confirm() : handle.reload()
        )
      )
    const confirm = () =>
      footer.replaceChildren(
        el(
          "div",
          "ccs-muted ccs-small",
          `This can take a while to load all ${plural(state.loaded, "game")}`
        ),
        el(
          "div",
          "ccs-actions",
          button("Cancel", "Keep the current result", showSummary),
          button("OK", "Load all games again", () => handle.reload())
        )
      )
    showSummary()
    return [row(accuracyLabel(), state.games ? value : "–"), footer]
  }

  if (state.status === "idle")
    return [
      row(
        accuracyLabel(),
        button("Load", "Load the all-time accuracy", () => handle.start())
      )
    ]

  if (state.status === "failed")
    return [
      row(
        accuracyLabel(),
        button("Retry", "Try again", () => handle.start())
      ),
      note(
        `Stopped after ${countText(state)}: chess.com sent something unexpected`
      )
    ]

  const progress = el("div", "ccs-progress", el("span", "ccs-progress-fill"))
  progress.setAttribute("role", "progressbar")
  progress.setAttribute("aria-valuemin", "0")
  progress.setAttribute("aria-valuemax", "100")
  return [
    row(accuracyLabel(), el("span", "ccs-acc-value")),
    progress,
    el(
      "div",
      "ccs-row",
      el("div", "ccs-muted ccs-small ccs-acc-note"),
      state.status === "loading"
        ? button("Stop", "Stop loading", () => handle.stop())
        : button("Resume", "Continue where it stopped", () => handle.start())
    )
  ]
}

function updateProgress(container: HTMLElement, state: AccuracyState): void {
  const value = container.querySelector(".ccs-acc-value")
  const progress = container.querySelector<HTMLElement>(".ccs-progress")
  const fill = container.querySelector<HTMLElement>(".ccs-progress-fill")
  const noteText = container.querySelector(".ccs-acc-note")
  if (!value || !progress || !fill || !noteText) return

  value.textContent = state.accuracy !== undefined ? `${state.accuracy}%` : "–"

  if (state.total) {
    // never show 100% before the last page arrived
    const percent = Math.min(99, (state.loaded / state.total) * 100)
    progress.classList.remove("is-indeterminate")
    fill.style.width = `${percent}%`
    progress.setAttribute("aria-valuenow", String(Math.round(percent)))
  } else {
    progress.classList.toggle("is-indeterminate", state.status === "loading")
    fill.style.width = ""
    progress.removeAttribute("aria-valuenow")
  }

  noteText.textContent =
    state.status === "stopped"
      ? `Stopped at ${countText(state)}`
      : state.retrying
        ? `chess.com isn't answering, trying again… (${countText(state)})`
        : `Loading ${countText(state)}…`
}

function countText(state: AccuracyState): string {
  if (!state.total) return plural(state.loaded, "game")
  const total = state.total.toLocaleString("en-US")
  return `${state.loaded.toLocaleString("en-US")} of ${total} games`
}

function note(text: string): HTMLElement {
  return el("div", "ccs-muted ccs-small", text)
}

function button(
  label: string,
  title: string,
  onClick: () => void
): HTMLElement {
  const action = el("button", "ccs-button", label)
  action.type = "button"
  action.title = title
  action.addEventListener("click", onClick)
  return action
}
