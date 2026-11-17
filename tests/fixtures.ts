import type { Game } from "../src/lib/api"

export const NOW = new Date("2026-08-26T20:00:00Z").getTime()
export const HOUR = 3_600_000
export const DAY = 24 * HOUR

let nextId = 1

export function game(overrides: {
  id?: string
  ago?: number
  mode?: Game["mode"]
  white?: Partial<Game["white"]>
  black?: Partial<Game["black"]>
}): Game {
  return {
    id: overrides.id ?? String(nextId++),
    endTime: NOW - (overrides.ago ?? HOUR),
    mode: "mode" in overrides ? overrides.mode : "blitz",
    white: { username: "Me", result: "win", ...overrides.white },
    black: { username: "Opponent", result: "loss", ...overrides.black }
  }
}

export function hydratedGame(opts: {
  key: string
  legacyId?: string
  endedAt: number
  timeClass?: string
  white?: string
  black?: string
  whiteResult?: string
  blackResult?: string
  whiteAccuracy?: number | null
  client?: string
}) {
  return {
    game: {
      key: opts.key,
      legacyId: opts.legacyId,
      endedAt: new Date(opts.endedAt).toISOString(),
      timeClass: opts.timeClass ?? "TIME_CLASS_RAPID",
      chessGame: {
        whitePlayer: {
          result: opts.whiteResult ?? "PLAYER_RESULT_WIN",
          displayName: opts.white ?? "Me",
          client: opts.client
        },
        blackPlayer: {
          result: opts.blackResult ?? "PLAYER_RESULT_LOSE",
          displayName: opts.black ?? "Opponent"
        }
      }
    },
    analysisMetadata: {
      whitePlayerMetadata:
        opts.whiteAccuracy === undefined
          ? null
          : { accuracy: opts.whiteAccuracy },
      blackPlayerMetadata: null
    }
  }
}

function playerHtml(
  side: "top" | "bottom",
  username: string,
  color: string,
  compact: boolean
) {
  const name = compact
    ? `<div class="user-tagline-compact-row"><span class="user-tagline-compact-username">${username}</span></div>`
    : `<div class="user-tagline-component"><span class="cc-user-badge-component"></span><a class="cc-user-username-component">${username}</a></div>`
  return `<div class="board-layout-${side}"><div class="player-tagline">${name}</div><div class="clock-component clock-${color}">3:00</div></div>`
}

/** Minimal version of chess.com's game page layout. */
export function mountBoard(
  opts: {
    top?: string
    bottom?: string
    bottomColor?: "white" | "black"
    compact?: boolean
    url?: string
  } = {}
) {
  const bottomColor = opts.bottomColor ?? "white"
  const topColor = bottomColor === "white" ? "black" : "white"
  document.body.innerHTML =
    playerHtml("top", opts.top ?? "Opponent", topColor, !!opts.compact) +
    `<div class="board"></div><div class="move-list"></div>` +
    playerHtml("bottom", opts.bottom ?? "Me", bottomColor, !!opts.compact)
  window.history.pushState({}, "", opts.url ?? "/game/live/1000")
}

/**
 * chess.com's game-over modal, shown after a game and also for finished
 * games opened from the history.
 */
export function showGameOver(gameId?: string) {
  const link = gameId
    ? `<a href="/analysis/game/live/${gameId}?tab=review">Game Review</a>`
    : ""
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="board-modal-component"><div class="game-over-modal-shell-container"><span>Black Won</span>${link}</div></div>`
  )
}

export function closeGameOver() {
  document.querySelector(".board-modal-component")?.remove()
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, { status })
}
