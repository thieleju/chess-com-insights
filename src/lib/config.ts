export const ARCHIVE_ENDPOINT =
  "https://www.chess.com/service/player-game-archive-v2/chesscom.game_gateway.v2.GameGatewayService/HydrateGamesByCriteria"
export const MEMBER_URL = "https://www.chess.com/member/"
export const PUBLIC_PLAYER_URL = "https://api.chess.com/pub/player/"
export const REPOSITORY_URL = "https://github.com/thieleju/chess-com-insights"

export const ARCHIVE_PAGE_SIZE = 50
/** Safety net so "last month" for very active players can't page forever. */
export const ARCHIVE_MAX_PAGES = 30
/**
 * All-time accuracy goes through the whole archive, page by page, only after
 * the user asked for it. Small pages keep single responses light and make the
 * progress bar move steadily.
 */
export const ALL_TIME_PAGE_SIZE = 500
/** From this many games on, updating the all-time accuracy asks first. */
export const RELOAD_CONFIRM_GAMES = 10_000
/**
 * While loading the all-time accuracy, connection problems are retried
 * forever, with pauses doubling from the first to the longest one.
 */
export const ALL_TIME_RETRY_FIRST_MS = 2_000
export const ALL_TIME_RETRY_MAX_MS = 30_000
export const FETCH_RETRIES = 3
export const FETCH_RETRY_DELAY_MS = 800

/** Players whose uuid and join date are kept in storage. */
export const MAX_CACHED_PLAYERS = 500
/** Players whose all-time accuracy is kept in storage. */
export const MAX_CACHED_ACCURACIES = 100

/** How long fetched games are reused before a new request is made. */
export const STATS_CACHE_TTL_MS = 5 * 60_000
/**
 * When the game-over dialog shows a game the stats don't contain yet, the
 * latest games are requested after these delays. The archive lags behind, so
 * a later request only happens while the game still isn't there; games that
 * are already in the stats cause no request at all.
 */
export const GAME_END_REFETCH_DELAYS_MS = [2_000, 8_000, 20_000]
/** How many of the latest games are requested after a game ended. */
export const RECENT_GAMES_COUNT = 10
/** A game found after the game-over dialog only counts as "just ended" if it is this fresh. */
export const RECENT_GAME_MS = 10 * 60_000
/** How long the "(+1W)" delta badge stays visible. */
export const DELTA_VISIBLE_MS = 6_000
/** Hovering this long opens the tooltip, leaving it this long closes it. */
export const TOOLTIP_DELAY_MS = 250
export const TOOLTIP_CLOSE_DELAY_MS = 200
/** Minimum time between two DOM scans while chess.com mutates the page. */
export const SCAN_THROTTLE_MS = 250

export const ACCOUNT_AGE_WARNING_DAYS = 90
export const ACCOUNT_AGE_CRITICAL_DAYS = 30

export const SPECIAL_TITLES: Record<string, string> = {
  robertbrot: "AFM"
}
