/**
 * Everything that reads chess.com's DOM lives here
 */

export type Side = "top" | "bottom"
export const SIDES: readonly Side[] = ["top", "bottom"]

const SIDE_CONTAINER: Record<Side, string> = {
  top: ".board-layout-top",
  bottom: ".board-layout-bottom"
}

const LAYOUTS: [string, string][] = [
  [".cc-user-username-component", ".cc-user-username-component"],
  [".user-tagline-compact-username", ".user-tagline-compact-row"],
  [".user-username-component", ".user-username-component"]
]

export function getSideContainer(side: Side, doc = document): Element | null {
  return doc.querySelector(SIDE_CONTAINER[side])
}

export function getUsername(side: Side, doc = document): string {
  const container = getSideContainer(side, doc)
  for (const [username] of LAYOUTS) {
    const name = container?.querySelector(username)?.textContent?.trim()
    if (name) return name
  }
  return ""
}

export function getUsernameElement(side: Side, doc = document): Element | null {
  const container = getSideContainer(side, doc)
  for (const [username] of LAYOUTS) {
    const element = container?.querySelector(username)
    if (element?.textContent?.trim()) return element
  }
  return null
}

export function getStatsParent(side: Side, doc = document): Element | null {
  const container = getSideContainer(side, doc)
  for (const [username, anchor] of LAYOUTS) {
    if (!container?.querySelector(username)) continue
    const parent = container.querySelector(anchor)?.parentElement
    if (parent) return parent
  }
  return null
}

const GAME_OVER_MODAL =
  ".game-over-modal-shell-container, .game-over-modal-content, .game-over-header-component"

export function getGameOver(
  doc = document
): { gameId: string | undefined } | undefined {
  const modal = doc.querySelector(GAME_OVER_MODAL)
  if (!modal) return undefined
  const link = modal.querySelector<HTMLAnchorElement>('a[href*="/game/"]')
  const fromLink = link?.getAttribute("href")?.match(/\/game\/(?:live\/)?(\d+)/)
  return { gameId: fromLink?.[1] ?? getGameId(doc.location) }
}

export function getGameId(
  location: Location = window.location
): string | undefined {
  return location.pathname.match(/\/game\/(?:live\/|daily\/)?(\d+)/)?.[1]
}

export function isDailyGame(location: Location = window.location): boolean {
  return location.pathname.includes("/daily/")
}
