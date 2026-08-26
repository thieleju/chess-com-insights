import { DateTime } from "luxon"

import { TimeInterval } from "../types/settings"

const TIME_ZONE = "America/Los_Angeles"

const dayBasedIntervalOffsets: Record<
  Exclude<TimeInterval, "last month">,
  number
> = {
  today: 0,
  "last 3 days": 2,
  "last week": 6
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
  const now = DateTime.now().setZone(TIME_ZONE)
  const currentTime = Math.floor(Date.now() / 1000)

  if (endTime > currentTime) return false

  if (timeInterval === "last month") {
    const startOfLastMonth = Math.floor(
      now.startOf("month").minus({ months: 1 }).toSeconds()
    )
    const startOfThisMonth = Math.floor(now.startOf("month").toSeconds())

    return endTime >= startOfLastMonth && endTime < startOfThisMonth
  }

  const daysBack = dayBasedIntervalOffsets[timeInterval]
  const startOfInterval = Math.floor(
    now.startOf("day").minus({ days: daysBack }).toSeconds()
  )
  const startOfTomorrow = Math.floor(
    now.startOf("day").plus({ days: 1 }).toSeconds()
  )

  return endTime >= startOfInterval && endTime < startOfTomorrow
}
