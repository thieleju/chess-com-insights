import type { GameMode, ScoreOrder } from "../lib/settings"

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: (Node | string | number)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  node.append(...children.map((c) => (typeof c === "number" ? String(c) : c)))
  return node
}

const SVG_NS = "http://www.w3.org/2000/svg"

/** Builds a 24x24 stroke icon from path data */
export function icon(paths: string[], className = "ccs-icon"): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("class", className)
  svg.setAttribute("aria-hidden", "true")
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", d)
    svg.append(path)
  }
  return svg
}

export const ICONS = {
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  ],
  back: ["M15 18l-6-6 6-6"],
  sun: [
    "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
    "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
  ],
  moon: ["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"],
  github: [
    "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
  ]
}

export const DEVICE_ICONS = {
  pc: [
    "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    "M8 21h8",
    "M12 17v4"
  ],
  phone: [
    "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
    "M11 18h2"
  ]
}

export const MODE_ICONS: Record<GameMode, string[]> = {
  bullet: [
    "m7.17 15.3 1.43 1.47-8.27 6.9zm-6.87 2.3 4.5-6 .9 2zm10.47-7.5c3.47-3.6 5.93-5.2 8.7-6.4-2.4 0-5.3.37-9.8 4.6.03.5.7 1.47 1.1 1.8zm11.06-7.93s.23 1.1.23 2.77c0 2.67-.67 6.83-4.17 10.33l-2.17 2.17c-.67.67-1.33.6-2.13.27l-7.47 6.3 9.8-12.17-5.23 4.03c-.43-.4-.93-.83-1.33-1.23-1.73-1.7-4.13-5-2.77-6.37l2.2-2.13c3.53-3.5 7.63-4.2 10.3-4.2 1.63 0 2.73.23 2.73.23zm0 0"
  ],
  blitz: [
    "m5.77 15c-1.03 0-1.37-.4-1.2-1.4l1.53-10.2c.17-1 .63-1.4 1.67-1.4h5.8c1.03 0 1.33.4 1.07 1.37l-3.23 11.63zm13.06-6c1.03 0 1.2.33.57 1.13l-9.67 12.73c-1.23 1.63-1.6 1.47-1.27-.57l2.2-13.3zm0 0"
  ],
  rapid: [
    "m11.97 14.63c-.9 0-1.87-.73-1.5-2.23l1.03-4.4h1l1.03 4.37c.37 1.53-.63 2.27-1.57 2.27zm.03 7.87c-5.23 0-9.5-4.27-9.5-9.5s4.27-9.5 9.5-9.5 9.5 4.27 9.5 9.5-4.27 9.5-9.5 9.5zm0-3c4 0 6.5-2.5 6.5-6.5s-2.5-6.5-6.5-6.5-6.5 2.5-6.5 6.5 2.5 6.5 6.5 6.5zm-1.5-14.27v-4.23h3v4.23zm5-3.23h-7c0-1.7.43-2 3.5-2s3.5.3 3.5 2zm0 0"
  ]
}

export interface Score {
  wins: number
  losses: number
  draws: number
}

export function orderedScore(
  score: Score,
  order: ScoreOrder
): { key: "w" | "l" | "d"; value: number }[] {
  const w = { key: "w" as const, value: score.wins }
  const l = { key: "l" as const, value: score.losses }
  const d = { key: "d" as const, value: score.draws }
  return order === "wdl" ? [w, d, l] : [w, l, d]
}

export function scoreLabel(order: ScoreOrder): string {
  return order === "wdl" ? "W/D/L" : "W/L/D"
}

export function scoreText(
  score: Score,
  order: ScoreOrder,
  separator = " / "
): string {
  return orderedScore(score, order)
    .map((p) => p.value)
    .join(separator)
}

export function plural(count: number, word: string): string {
  return `${count.toLocaleString("en-US")} ${word}${count === 1 ? "" : "s"}`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
