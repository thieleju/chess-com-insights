import type { Result } from "../lib/api"
import type { Settings } from "../lib/settings"
import type { AccountAge, Device, Stats } from "../lib/stats"
import type { Side } from "../content/dom"
import { DEVICE_ICONS, el, icon, orderedScore } from "./el"

export interface StatsView {
  username: string
  stats: Stats
  settings: Pick<
    Settings,
    | "show_accuracy"
    | "show_device"
    | "color_highlighting"
    | "time_interval"
    | "show_account_age"
    | "score_order"
    | "game_modes"
    | "pill_size"
    | "stats_style"
  >
  age?: AccountAge & { joined: number }
  delta?: { result: Result; since: number }
}

export type StatsElement = HTMLElement & { ccsView?: StatsView }

const DELTA_LABEL: Record<Result, string> = {
  win: "+1W",
  loss: "+1L",
  draw: "+1D"
}
export const DEVICE_LABEL = { phone: "Phone", pc: "Desktop" } as const

/**
 * SVG instead of the 🖥️/📱 emoji
 */
export function deviceIcon(platform: Device["platform"]): SVGSVGElement {
  const svg = icon(DEVICE_ICONS[platform], "ccs-icon ccs-device")
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", DEVICE_LABEL[platform])
  svg.removeAttribute("aria-hidden")
  return svg
}

export function findStatsElement(
  side: Side,
  doc = document
): StatsElement | null {
  return doc.querySelector<HTMLElement>(`.ccs-stats[data-side="${side}"]`)
}

export function removeStatsElement(side: Side, doc = document): void {
  findStatsElement(side, doc)?.remove()
}

/**
 * Creates or updates the stats element for one side
 */
export function renderStats(
  side: Side,
  parent: Element,
  view: StatsView
): StatsElement {
  let root = findStatsElement(side)
  if (root && root.parentElement !== parent) {
    root.remove()
    root = null
  }
  if (!root) {
    root = el("span", "ccs-stats")
    root.dataset.side = side
    parent.appendChild(root)
  }

  root.ccsView = view
  const key = JSON.stringify(view)
  if (root.dataset.key === key) return root
  root.dataset.key = key
  root.dataset.user = view.username
  root.dataset.size = view.settings.pill_size
  root.dataset.style = view.settings.stats_style

  const { stats, settings } = view
  const score = el(
    "span",
    settings.color_highlighting ? "ccs-score ccs-colored" : "ccs-score"
  )
  orderedScore(stats, settings.score_order).forEach((part, i) => {
    const value = text(`ccs-${part.key}`, part.value)
    // the first number carries the probe updateLayout centers the text with
    if (i === 0) value.append(el("span", "ccs-probe"))
    if (i > 0) score.append(el("span", "ccs-sep", "/"))
    score.append(value)
  })

  const pill = el("span", "ccs-pill", score)
  if (settings.show_accuracy && stats.accuracy !== undefined)
    pill.append(text("ccs-acc", `${stats.accuracy}%`))
  if (settings.show_device && stats.device)
    pill.append(deviceIcon(stats.device.platform))

  const children: HTMLElement[] = [pill]
  if (settings.show_account_age && view.age?.level === "critical")
    children.push(
      el(
        "span",
        `ccs-age ccs-age--${view.age.level}`,
        text("ccs-age-text", view.age.days < 1 ? "today" : `${view.age.days}d`)
      )
    )
  if (view.delta) {
    const delta = text(
      `ccs-delta ccs-delta--${view.delta.result}`,
      DELTA_LABEL[view.delta.result]
    )
    // continue the fade where it was if chess.com replaced the row in between
    delta.style.animationDelay = `-${Math.max(0, Date.now() - view.delta.since)}ms`
    children.push(delta)
  }

  root.replaceChildren(...children)
  return root
}

/** Text that gets vertically centered by `--ccs-text-shift`. */
function text(className: string, value: string | number): HTMLElement {
  return el("span", `${className} ccs-text`, value)
}

/**
 * In theatre/focus mode chess.com stacks the player info vertically
 */
export function updateLayout(
  root: HTMLElement,
  username: Element | null
): void {
  const parentStyle = root.parentElement
    ? getComputedStyle(root.parentElement)
    : undefined
  const column = !!parentStyle?.flexDirection.startsWith("column")
  let wrapped = false
  if (!column && username) {
    const own = root.getBoundingClientRect()
    const name = username.getBoundingClientRect()
    wrapped = own.height > 0 && name.height > 0 && own.top >= name.bottom - 1
  }
  const stacked = column || wrapped
  if (root.classList.contains("ccs-stats--stacked") !== stacked)
    root.classList.toggle("ccs-stats--stacked", stacked)

  setPx(root, "--ccs-snap", pixelSnap(root))
  setPx(root, "--ccs-text-shift", textShift(root))
}

function setPx(root: HTMLElement, name: string, value: number | undefined) {
  if (value === undefined) return
  const px = `${value}px`
  if (root.style.getPropertyValue(name) !== px) root.style.setProperty(name, px)
}

function appliedPx(root: HTMLElement, name: string): number {
  const value = parseFloat(root.style.getPropertyValue(name))
  return Number.isFinite(value) ? value : 0
}

export function pixelSnap(root: HTMLElement): number | undefined {
  const rect = root.getBoundingClientRect()
  if (!rect.height) return undefined
  const dpr = window.devicePixelRatio || 1
  const top = (rect.top - appliedPx(root, "--ccs-snap")) * dpr
  return Math.round(((Math.round(top) - top) / dpr) * 100) / 100
}

/**
 * How far the text has to move (in px) so the digits sit exactly in the
 * middle of their box
 */
export function textShift(root: HTMLElement): number | undefined {
  const probe = root.querySelector<HTMLElement>(".ccs-probe")
  const text = probe?.parentElement
  const box = probe?.closest(".ccs-pill")
  if (!probe || !text || !box) return undefined
  const boxRect = box.getBoundingClientRect()
  if (!boxRect.height) return undefined
  const ink = digitInk(getComputedStyle(text))
  if (!ink) return undefined

  // the probe moves with the shift that is applied right now
  const baseline =
    probe.getBoundingClientRect().bottom -
    appliedPx(root, "--ccs-text-shift") -
    boxRect.top
  // the baseline that puts the middle of the ink on the middle of the box
  const ideal = boxRect.height / 2 + (ink.ascent - ink.descent) / 2
  const dpr = window.devicePixelRatio || 1
  return Math.round((Math.round(ideal * dpr) / dpr - baseline) * 100) / 100
}

let measureContext: CanvasRenderingContext2D | null | undefined
const inkCache = new Map<string, { ascent: number; descent: number }>()

/** Height of the digit glyphs above and below the baseline, in px. */
function digitInk(
  style: CSSStyleDeclaration
): { ascent: number; descent: number } | undefined {
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const cached = inkCache.get(font)
  if (cached) return cached

  try {
    measureContext ??= document.createElement("canvas").getContext("2d")
  } catch {
    measureContext = null
  }
  if (!measureContext) return undefined
  measureContext.font = font
  const metrics = measureContext.measureText("0123456789")
  if (!metrics.actualBoundingBoxAscent) return undefined

  const ink = {
    ascent: metrics.actualBoundingBoxAscent,
    descent: metrics.actualBoundingBoxDescent
  }
  // a web font that is still loading would be measured with its fallback
  if (document.fonts?.check(font) !== false) inkCache.set(font, ink)
  return ink
}

// ---------------------------------------------------------------------------

export function renderTitle(parent: Element, title: string | undefined): void {
  const existing = parent.querySelector<HTMLElement>(".ccs-title")
  const badge = parent.querySelector<HTMLElement>(".cc-user-badge-component")

  if (!title) {
    if (!existing) return
    existing.remove()
    if (badge) badge.style.display = ""
    return
  }
  if (existing?.textContent === title) return

  existing?.remove()
  const link = el("a", "user-chess-title-component ccs-title", title)
  link.href = "/members/titled-players"
  link.target = "_blank"
  if (badge) badge.style.display = "none"
  parent.prepend(link)
}
