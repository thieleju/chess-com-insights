import { DateTime } from "luxon"

import { TimeInterval } from "../types/settings"

const TIME_ZONE = "America/Los_Angeles"

const intervalDurations: Record<TimeInterval, { hours: number }> = {
  "last 6 hours": { hours: 6 },
  "last 12 hours": { hours: 12 },
  "last 3 days": { hours: 72 },
  "last week": { hours: 168 },
  "last month": { hours: 720 }
}

export function parseGameEndTime(
  gameEndTime: number | string | undefined
): number {
  if (typeof gameEndTime === "number") return gameEndTime

  if (typeof gameEndTime !== "string") return Number.NaN

  const parsedEndTime = DateTime.fromFormat(gameEndTime, "MMM d, yyyy", {
    zone: TIME_ZONE
  })

  if (!parsedEndTime.isValid) return Number.NaN

  return Math.floor(
    Math.min(parsedEndTime.endOf("day").toSeconds(), Date.now() / 1000)
  )
}

export function isWithinTimeInterval(
  endTime: number,
  timeInterval: TimeInterval
): boolean {
  const { start, end } = getTimeIntervalBounds(timeInterval)

  return endTime >= start && endTime <= end
}

export function getTimeIntervalBounds(timeInterval: TimeInterval): {
  start: number
  end: number
} {
  const now = DateTime.now().setZone(TIME_ZONE)
  const end = Math.floor(Date.now() / 1000)
  const start = Math.floor(
    now.minus(intervalDurations[timeInterval]).toSeconds()
  )

  return { start, end }
}
