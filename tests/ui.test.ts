import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock
} from "vitest"

import { getStatsParent, getUsernameElement } from "../src/content/dom"
import type { LifetimeStats } from "../src/lib/api"
import { DEFAULT_SETTINGS, type Settings } from "../src/lib/settings"
import {
  renderStats,
  pixelSnap,
  renderTitle,
  textShift,
  updateLayout,
  type StatsView
} from "../src/ui/pill"
import { createSettingsForm } from "../src/ui/settings-form"
import {
  Tooltip,
  type AccuracyHandle,
  type AccuracyState
} from "../src/ui/tooltip"
import { DAY, mountBoard } from "./fixtures"

function view(overrides: Partial<StatsView> = {}): StatsView {
  return {
    username: "Opponent",
    stats: {
      wins: 7,
      losses: 2,
      draws: 1,
      games: 10,
      accuracy: 91,
      analyzedGames: 6,
      device: { platform: "pc", details: "Windows 10 · chrome" }
    },
    settings: DEFAULT_SETTINGS,
    ...overrides
  }
}

describe("renderStats", () => {
  let parent: Element

  beforeEach(() => {
    mountBoard()
    parent = getStatsParent("top")!
  })

  it("renders score, accuracy and device", () => {
    const root = renderStats("top", parent, view())
    expect(root.parentElement).toBe(parent)
    expect(root.querySelector(".ccs-score")!.textContent).toBe("7/2/1")
    expect(root.querySelector(".ccs-score")!.classList).toContain("ccs-colored")
    expect(root.querySelector(".ccs-acc")!.textContent).toBe("91%")
    expect(root.querySelector(".ccs-device")!.getAttribute("aria-label")).toBe(
      "Desktop"
    )
  })

  it("can hide the device icon", () => {
    const root = renderStats(
      "top",
      parent,
      view({ settings: { ...DEFAULT_SETTINGS, show_device: false } })
    )
    expect(root.querySelector(".ccs-device")).toBeNull()
    expect(root.querySelector(".ccs-acc")).not.toBeNull()
  })

  it("applies the pill size", () => {
    const root = renderStats("top", parent, view())
    expect(root.dataset.size).toBe("medium")
    renderStats(
      "top",
      parent,
      view({ settings: { ...DEFAULT_SETTINGS, pill_size: "small" } })
    )
    expect(root.dataset.size).toBe("small")
  })

  it("supports the W/D/L order", () => {
    const root = renderStats(
      "top",
      parent,
      view({ settings: { ...DEFAULT_SETTINGS, score_order: "wdl" } })
    )
    expect(root.querySelector(".ccs-score")!.textContent).toBe("7/1/2")
    expect(
      [...root.querySelectorAll(".ccs-score > span:not(.ccs-sep)")].map(
        (s) => s.classList[0]
      )
    ).toEqual(["ccs-w", "ccs-d", "ccs-l"])
  })

  it("renders every style with the same content", () => {
    for (const stats_style of ["pill", "box", "outline", "text"] as const) {
      const root = renderStats(
        "top",
        parent,
        view({ settings: { ...DEFAULT_SETTINGS, stats_style } })
      )
      expect(root.dataset.style).toBe(stats_style)
      expect(root.querySelector(".ccs-score")!.textContent).toBe("7/2/1")
      expect(root.querySelector(".ccs-acc")!.textContent).toBe("91%")
    }
  })

  it("respects accuracy and color settings", () => {
    const root = renderStats(
      "top",
      parent,
      view({
        settings: {
          ...DEFAULT_SETTINGS,
          show_accuracy: false,
          color_highlighting: false
        }
      })
    )
    expect(root.querySelector(".ccs-acc")).toBeNull()
    expect(root.querySelector(".ccs-score")!.classList).not.toContain(
      "ccs-colored"
    )
  })

  it("does not touch the DOM when nothing changed", () => {
    const root = renderStats("top", parent, view())
    const pill = root.querySelector(".ccs-pill")
    expect(renderStats("top", parent, view())).toBe(root)
    expect(root.querySelector(".ccs-pill")).toBe(pill)
  })

  it("moves the element when chess.com re-rendered the player row", () => {
    const root = renderStats("top", parent, view())
    mountBoard()
    const newParent = getStatsParent("top")!
    const moved = renderStats("top", newParent, view())
    expect(moved.parentElement).toBe(newParent)
    expect(root.isConnected).toBe(false)
  })

  it("shows account age badges", () => {
    const joined = Date.now()
    const root = renderStats(
      "top",
      parent,
      view({ age: { days: 12, level: "critical", joined } })
    )
    expect(root.querySelector(".ccs-age--critical")!.textContent).toBe("12d")

    renderStats("top", parent, view({ age: { days: 400, joined } }))
    expect(root.querySelector(".ccs-age")).toBeNull()

    renderStats(
      "top",
      parent,
      view({
        age: { days: 45, level: "warning", joined },
        settings: { ...DEFAULT_SETTINGS, show_account_age: false }
      })
    )
    expect(root.querySelector(".ccs-age")).toBeNull()
  })

  it.each([
    ["win", "+1W"],
    ["loss", "+1L"],
    ["draw", "+1D"]
  ] as const)(
    "shows the %s delta and keeps its animation position",
    (result, label) => {
      const root = renderStats(
        "top",
        parent,
        view({ delta: { result, since: Date.now() - 2000 } })
      )
      const delta = root.querySelector<HTMLElement>(`.ccs-delta--${result}`)!
      expect(delta.textContent).toBe(label)
      expect(parseInt(delta.style.animationDelay)).toBeLessThanOrEqual(-2000)
    }
  )

  it("centers the stats when chess.com stacks the player info", () => {
    const root = renderStats("top", parent, view())
    updateLayout(root, getUsernameElement("top"))
    expect(root.classList).not.toContain("ccs-stats--stacked")

    ;(parent as HTMLElement).style.display = "flex"
    ;(parent as HTMLElement).style.flexDirection = "column"
    updateLayout(root, getUsernameElement("top"))
    expect(root.classList).toContain("ccs-stats--stacked")
  })
})

describe("textShift", () => {
  function rect(top: number, height: number): DOMRect {
    return { top, height, bottom: top + height } as DOMRect
  }

  function measured(boxTop: number, boxHeight: number, probeBottom: number) {
    mountBoard()
    const root = renderStats("top", getStatsParent("top")!, view())
    vi.spyOn(
      root.querySelector(".ccs-pill")!,
      "getBoundingClientRect"
    ).mockReturnValue(rect(boxTop, boxHeight))
    vi.spyOn(
      root.querySelector(".ccs-probe")!,
      "getBoundingClientRect"
    ).mockImplementation(() => {
      // the probe moves with the shift that is applied
      const applied = parseFloat(
        root.style.getPropertyValue("--ccs-text-shift")
      )
      return rect(probeBottom + (applied || 0), 0)
    })
    return root
  }

  beforeEach(() => {
    // digits of chess.com's "Chess Sans" at 12px
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: () => ({
        actualBoundingBoxAscent: 8.6,
        actualBoundingBoxDescent: 0.2
      })
    } as unknown as CanvasRenderingContext2D)
  })

  it("puts the baseline on the pixel that centers the digits", () => {
    // 19px box at y=100, the browser put the baseline at 112.5:
    // ideal baseline 109.5 + 4.2 = 113.7, snapped to 114
    const root = measured(100, 19, 112.5)
    expect(textShift(root)).toBe(1.5)
  })

  it("keeps the same distance to the box when it sits at a half pixel", () => {
    // box and text get rounded the same way, so the baseline must be a whole
    // number of pixels below the top of the box (14), not at a whole pixel
    const root = measured(100.5, 19, 113)
    expect(textShift(root)).toBe(1.5)
  })

  it("stays the same once the shift is applied", () => {
    const root = measured(100, 19, 112.5)
    updateLayout(root, null)
    expect(root.style.getPropertyValue("--ccs-text-shift")).toBe("1.5px")
    updateLayout(root, null)
    expect(root.style.getPropertyValue("--ccs-text-shift")).toBe("1.5px")
  })

  it("moves the stats onto whole pixels", () => {
    mountBoard()
    const root = renderStats("top", getStatsParent("top")!, view())
    vi.spyOn(root, "getBoundingClientRect").mockImplementation(() => {
      const applied = parseFloat(root.style.getPropertyValue("--ccs-snap"))
      return rect(40.3 + (applied || 0), 19)
    })
    expect(pixelSnap(root)).toBe(-0.3)
    root.style.setProperty("--ccs-snap", "-0.3px")
    // stable once applied
    expect(pixelSnap(root)).toBe(-0.3)
  })

  it("does nothing while the stats aren't rendered", () => {
    mountBoard()
    const root = renderStats("top", getStatsParent("top")!, view())
    expect(textShift(root)).toBeUndefined()
  })
})

describe("Tooltip", () => {
  const lifetime: LifetimeStats = {
    blitz: { rating: 1688, wins: 230, losses: 201, draws: 19 },
    rapid: {
      rating: 1745,
      peak: { rating: 1812, date: Date.UTC(2025, 2, 4, 12) },
      wins: 61,
      losses: 40,
      draws: 7
    }
  }
  let settings: Settings
  let deps: {
    lifetime: Mock<(username: string) => Promise<LifetimeStats>>
    settings: () => Settings
    allTimeAccuracy: Mock<(username: string) => AccuracyHandle>
    saveSettings: Mock<(settings: Settings) => void>
  }
  let tooltip: Tooltip

  function open(overrides: Partial<StatsView> = {}) {
    renderStats("top", getStatsParent("top")!, view({ settings, ...overrides }))
    tooltip.open("top")
    return document.getElementById("ccs-tooltip")!
  }

  let accuracy: ReturnType<typeof fakeAccuracy>

  beforeEach(() => {
    mountBoard()
    settings = { ...DEFAULT_SETTINGS }
    accuracy = fakeAccuracy({
      status: "done",
      loaded: 1338,
      total: 1338,
      accuracy: 88,
      analyzed: 912,
      games: 1338
    })
    deps = {
      lifetime: vi.fn(async () => lifetime),
      allTimeAccuracy: vi.fn(() => accuracy.handle),
      settings: () => settings,
      saveSettings: vi.fn()
    }
    tooltip = new Tooltip(deps)
  })

  afterEach(() => tooltip.close())

  it("shows the recent stats", () => {
    const text = open().textContent
    expect(text).toContain("Last 12 hours10 games")
    expect(text).toContain("W/L/D7 / 2 / 1")
    expect(text).toContain("Avg. accuracy91%")
    expect(text).toContain("Based on 6 analyzed games out of 10")
    expect(text).toContain("Windows 10 · chrome")
  })

  it("loads all-time stats lazily and shows a loading state meanwhile", async () => {
    let resolve!: (value: LifetimeStats) => void
    deps.lifetime.mockReturnValue(new Promise((r) => (resolve = r)))
    expect(deps.lifetime).not.toHaveBeenCalled()

    const element = open()
    expect(deps.lifetime).toHaveBeenCalledWith("Opponent")
    expect(element.querySelector(".ccs-lifetime.is-loading")).not.toBeNull()

    resolve(lifetime)
    await vi.waitFor(() =>
      expect(element.querySelector(".ccs-lifetime.is-loading")).toBeNull()
    )
    const text = element.textContent
    expect(text).toContain("Blitz1688230 / 201 / 19")
    expect(element.querySelector(".ccs-mode-icon--blitz path")).not.toBeNull()
    // the peak only when it's higher than the current rating
    expect(text).toContain("Rapid1745 · peak 181261 / 40 / 7")
    expect(
      [...element.querySelectorAll<HTMLElement>(".ccs-rating")].find((r) =>
        r.textContent!.includes("peak")
      )!.title
    ).toBe("Peak on Mar 4, 2025")
    expect(text).toContain("Total291 / 241 / 26")
    expect(text).not.toContain("Bullet")
    expect(text).toContain("Avg. accuracy88%")
    expect(text).toContain("Based on 912 analyzed games out of 1,338")
  })

  it("explains when no game was analyzed", () => {
    const stats = { ...view().stats, accuracy: undefined, analyzedGames: 0 }
    const text = open({ stats }).textContent
    expect(text).toContain("Avg. accuracy–")
    expect(text).toContain("None of the 10 games were analyzed")
  })

  it("stays open after a click so the settings can be reached", async () => {
    vi.useFakeTimers()
    try {
      const root = renderStats(
        "top",
        getStatsParent("top")!,
        view({ settings })
      )
      tooltip.bind(root)
      root.click()
      expect(tooltip.isPinned).toBe(true)

      root.dispatchEvent(new MouseEvent("mouseleave"))
      await vi.advanceTimersByTimeAsync(1000)
      expect(tooltip.isOpen).toBe(true)

      document
        .querySelector<HTMLButtonElement>("[aria-label='Open settings']")!
        .click()
      expect(document.querySelector("#ccs-tooltip .ccs-form")).not.toBeNull()

      root.click()
      expect(tooltip.isOpen).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("can load the all-time accuracy again once it is done", async () => {
    accuracy.set({
      status: "done",
      loaded: 12951,
      total: 12951,
      accuracy: 88,
      analyzed: 10211,
      games: 12951
    })
    const element = open()
    const update = await vi.waitFor(() => {
      const button = element.querySelector<HTMLButtonElement>(
        ".ccs-accuracy button"
      )
      expect(button?.textContent).toBe("Update")
      return button!
    })
    expect(element.textContent).toContain(
      "Based on 10,211 analyzed games out of 12,951Update"
    )
    const buttons = () => [
      ...element.querySelectorAll<HTMLButtonElement>(".ccs-accuracy button")
    ]

    // a big archive: asks first, Cancel goes back
    update.click()
    expect(accuracy.handle.reload).not.toHaveBeenCalled()
    expect(element.textContent).toContain(
      "This can take a while to load all 12,951 games"
    )
    buttons()
      .find((b) => b.textContent === "Cancel")!
      .click()
    expect(element.textContent).toContain("out of 12,951Update")
    expect(accuracy.handle.reload).not.toHaveBeenCalled()

    buttons()
      .find((b) => b.textContent === "Update")!
      .click()
    buttons()
      .find((b) => b.textContent === "OK")!
      .click()
    expect(accuracy.handle.reload).toHaveBeenCalledTimes(1)
  })

  it("updates a small archive without asking", async () => {
    accuracy.set({
      status: "done",
      loaded: 9500,
      total: 9500,
      accuracy: 88,
      analyzed: 8000,
      games: 9500
    })
    const element = open()
    const update = await vi.waitFor(() => {
      const button = element.querySelector<HTMLButtonElement>(
        ".ccs-accuracy button"
      )
      expect(button?.textContent).toBe("Update")
      return button!
    })
    update.click()
    expect(accuracy.handle.reload).toHaveBeenCalledTimes(1)
    expect(element.textContent).not.toContain("This can take a while")
  })

  it("keeps the all-time part when the period stats change after a game", async () => {
    let records = lifetime
    deps.lifetime.mockImplementation(async () => records)
    const element = open()
    await vi.waitFor(() =>
      expect(element.textContent).toContain("Blitz1688230 / 201 / 19")
    )
    const section = element.querySelector(".ccs-accuracy")!.parentElement
    expect(accuracy.listeners.size).toBe(1)

    // a game ended: new period stats and new records, same player
    records = {
      ...lifetime,
      blitz: { rating: 1696, wins: 231, losses: 201, draws: 19 }
    }
    const stats = { ...view().stats, wins: 8, games: 11 }
    renderStats("top", getStatsParent("top")!, view({ settings, stats }))
    tooltip.update("top")

    expect(element.querySelector(".ccs-accuracy")!.parentElement).toBe(section)
    // the old records stay until the new ones are there, no loading state
    expect(element.querySelector(".ccs-lifetime.is-loading")).toBeNull()
    await vi.waitFor(() =>
      expect(element.textContent).toContain("Blitz1696231 / 201 / 19")
    )
    expect(accuracy.listeners.size).toBe(1)
    expect(deps.allTimeAccuracy).toHaveBeenCalledTimes(1)

    tooltip.close()
    expect(accuracy.listeners.size).toBe(0)
  })

  it("closes an unpinned hover preview when the pointer leaves", async () => {
    vi.useFakeTimers()
    try {
      const root = renderStats(
        "top",
        getStatsParent("top")!,
        view({ settings })
      )
      tooltip.bind(root)
      root.dispatchEvent(new MouseEvent("mouseenter"))
      await vi.advanceTimersByTimeAsync(300)
      expect(tooltip.isOpen).toBe(true)
      expect(tooltip.isPinned).toBe(false)

      root.dispatchEvent(new MouseEvent("mouseleave"))
      await vi.advanceTimersByTimeAsync(300)
      expect(tooltip.isOpen).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("can be pinned with the keyboard", () => {
    const root = renderStats("top", getStatsParent("top")!, view({ settings }))
    tooltip.bind(root)
    expect(root.tabIndex).toBe(0)
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    expect(tooltip.isPinned).toBe(true)
  })

  it("only loads the all-time accuracy after a click", async () => {
    accuracy.set({ status: "idle", loaded: 0, analyzed: 0, games: 0 })
    const element = open()
    const load = await vi.waitFor(() => {
      const button = element.querySelector<HTMLButtonElement>(
        ".ccs-accuracy button"
      )
      expect(button?.textContent).toBe("Load")
      return button!
    })
    expect(accuracy.handle.start).not.toHaveBeenCalled()
    load.click()
    expect(accuracy.handle.start).toHaveBeenCalledTimes(1)
  })

  it("shows the progress and the average so far while loading", async () => {
    const element = open()
    accuracy.set({
      status: "loading",
      loaded: 23000,
      total: 41210,
      accuracy: 86,
      analyzed: 15873,
      games: 22950
    })
    const fill = element.querySelector<HTMLElement>(".ccs-progress-fill")!
    expect(parseFloat(fill.style.width)).toBeCloseTo(55.8, 1)
    expect(element.textContent).toContain("Avg. accuracy86%")
    expect(element.textContent).toContain("Loading 23,000 of 41,210 games")

    accuracy.set({ status: "loading", loaded: 0, analyzed: 0, games: 0 })
    expect(
      element.querySelector(".ccs-progress.is-indeterminate")
    ).not.toBeNull()
  })

  it("can be stopped while loading and resumed later", () => {
    const element = open()
    const loading: AccuracyState = {
      status: "loading",
      loaded: 23000,
      total: 41210,
      accuracy: 86,
      analyzed: 15873,
      games: 22950
    }
    accuracy.set(loading)
    const stop = element.querySelector<HTMLButtonElement>(
      ".ccs-accuracy button"
    )!
    expect(stop.textContent).toBe("Stop")
    stop.click()
    expect(accuracy.handle.stop).toHaveBeenCalledTimes(1)

    accuracy.set({ ...loading, status: "stopped" })
    expect(element.textContent).toContain("Stopped at 23,000 of 41,210 games")
    expect(element.textContent).toContain("Avg. accuracy86%")
    const resume = element.querySelector<HTMLButtonElement>(
      ".ccs-accuracy button"
    )!
    expect(resume.textContent).toBe("Resume")
    resume.click()
    expect(accuracy.handle.start).toHaveBeenCalledTimes(1)
  })

  it("moves the progress bar forward instead of rebuilding it", () => {
    const element = open()
    const base: AccuracyState = {
      status: "loading",
      loaded: 500,
      total: 2000,
      analyzed: 0,
      games: 0
    }
    accuracy.set(base)
    const fill = element.querySelector<HTMLElement>(".ccs-progress-fill")!
    expect(fill.style.width).toBe("25%")

    accuracy.set({ ...base, loaded: 1000, accuracy: 84 })
    // same element, so the bar animates forward from where it was
    expect(element.querySelector(".ccs-progress-fill")).toBe(fill)
    expect(fill.style.width).toBe("50%")
    expect(element.textContent).toContain("Avg. accuracy84%")
    expect(element.textContent).toContain("Loading 1,000 of 2,000 games")

    // never full before the last page
    accuracy.set({ ...base, loaded: 2000 })
    expect(fill.style.width).toBe("99%")
  })

  it("tells when chess.com doesn't answer and it keeps trying", () => {
    const element = open()
    accuracy.set({
      status: "loading",
      retrying: true,
      loaded: 500,
      total: 41210,
      analyzed: 0,
      games: 0
    })
    expect(element.textContent).toContain(
      "chess.com isn't answering, trying again…"
    )
  })

  it("offers a retry when loading failed", () => {
    const element = open()
    accuracy.set({
      status: "failed",
      loaded: 500,
      total: 41210,
      analyzed: 0,
      games: 0
    })
    expect(element.textContent).toContain("Stopped after 500 of 41,210 games")
    const retry = element.querySelector<HTMLButtonElement>(
      ".ccs-accuracy button"
    )!
    expect(retry.textContent).toBe("Retry")
    retry.click()
    expect(accuracy.handle.start).toHaveBeenCalledTimes(1)
  })

  it("stops listening to the loader when the tooltip closes", () => {
    open()
    expect(accuracy.listeners.size).toBe(1)
    tooltip.close()
    expect(accuracy.listeners.size).toBe(0)
  })

  it("shows an error when all-time stats can't be loaded", async () => {
    deps.lifetime.mockRejectedValue(new Error("offline"))
    const element = open()
    await vi.waitFor(() =>
      expect(element.textContent).toContain("Could not load all-time stats")
    )
  })

  it("shows the join date with the account age", () => {
    const joined = new Date("2026-11-05T12:00:00Z").getTime()
    const critical = open({ age: { days: 12, level: "critical", joined } })
    expect(critical.querySelector(".ccs-callout--critical")!.textContent).toBe(
      "New accountJoined Nov 5, 2026 · 12 days ago"
    )

    const old = open({ age: { days: 4400, joined: joined - 4400 * DAY } })
    expect(old.textContent).toContain("Joined")
    expect(old.textContent).toContain("12 years ago")
  })

  it("switches to settings and back", () => {
    const element = open()
    element
      .querySelector<HTMLButtonElement>("[aria-label='Open settings']")!
      .click()
    expect(element.querySelector(".ccs-form")).not.toBeNull()

    element
      .querySelector<HTMLButtonElement>(".ccs-segmented button:last-child")!
      .click()
    expect(deps.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ game_modes: ["bullet", "blitz"] })
    )

    element
      .querySelector<HTMLButtonElement>("[aria-label='Back to stats']")!
      .click()
    expect(element.querySelector(".ccs-form")).toBeNull()
  })

  it("closes on Escape and outside clicks", () => {
    open()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(tooltip.isOpen).toBe(false)

    open()
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(tooltip.isOpen).toBe(false)
  })

  it("re-renders only when the data changed", () => {
    const element = open()
    const header = element.querySelector("header")
    tooltip.update("top")
    expect(element.querySelector("header")).toBe(header)

    renderStats(
      "top",
      getStatsParent("top")!,
      view({ settings, stats: { ...view().stats, wins: 8, games: 11 } })
    )
    tooltip.update("top")
    expect(element.textContent).toContain("8 / 2 / 1")
  })
})

describe("createSettingsForm", () => {
  it("emits every change immediately", () => {
    const onChange = vi.fn()
    const form = createSettingsForm({ ...DEFAULT_SETTINGS }, onChange)

    const accuracy = form.querySelectorAll<HTMLInputElement>(
      "input[type=checkbox]"
    )[1]!
    accuracy.checked = false
    accuracy.dispatchEvent(new Event("change"))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ show_accuracy: false })
    )

    const wdl = [...form.querySelectorAll("button")].find(
      (b) => b.textContent === "W/D/L"
    )!
    wdl.click()
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ score_order: "wdl", show_accuracy: false })
    )

    const select = form.querySelector("select")!
    select.value = "last week"
    select.dispatchEvent(new Event("change"))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ time_interval: "last week" })
    )
  })

  it("keeps the focus on the changed control", () => {
    const form = createSettingsForm({ ...DEFAULT_SETTINGS }, vi.fn())
    document.body.append(form)

    form.querySelector("select")!.focus()
    form.querySelector("select")!.value = "last week"
    form.querySelector("select")!.dispatchEvent(new Event("change"))
    expect(document.activeElement).toBe(form.querySelector("select"))

    const wdl = () =>
      [...form.querySelectorAll("button")].find(
        (b) => b.textContent === "W/D/L"
      )!
    wdl().focus()
    wdl().click()
    expect(document.activeElement).toBe(wdl())
    form.remove()
  })

  it("names the period select and the button groups", () => {
    const form = createSettingsForm({ ...DEFAULT_SETTINGS }, vi.fn())
    expect(form.querySelector("select")!.getAttribute("aria-label")).toMatch(
      /period$/
    )
    const groups = [...form.querySelectorAll("[role=group]")].map((g) =>
      g.getAttribute("aria-label")
    )
    expect(groups).toEqual(["Modes", "Score", "Style", "Size"])
  })

  it("keeps at least one game mode selected", () => {
    const onChange = vi.fn()
    const form = createSettingsForm(
      { ...DEFAULT_SETTINGS, game_modes: ["blitz"] },
      onChange
    )
    const blitz = [...form.querySelectorAll("button")].find(
      (b) => b.textContent === "Blitz"
    )!
    blitz.click()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("disables the other options while stats are hidden", () => {
    const form = createSettingsForm(
      { ...DEFAULT_SETTINGS, show_stats: false },
      vi.fn()
    )
    const inputs = [...form.querySelectorAll<HTMLInputElement>("input")]
    expect(inputs[0]!.disabled).toBe(false)
    expect(inputs.slice(1).every((i) => i.disabled)).toBe(true)
    expect(form.querySelector("select")!.disabled).toBe(true)
  })
})

describe("renderTitle", () => {
  it("adds and removes custom titles", () => {
    mountBoard()
    const parent = getStatsParent("top")!
    renderTitle(parent, "AFM")
    expect(parent.querySelector(".ccs-title")!.textContent).toBe("AFM")
    expect(
      parent.querySelector<HTMLElement>(".cc-user-badge-component")!.style
        .display
    ).toBe("none")

    renderTitle(parent, undefined)
    expect(parent.querySelector(".ccs-title")).toBeNull()
    expect(
      parent.querySelector<HTMLElement>(".cc-user-badge-component")!.style
        .display
    ).toBe("")
  })
})

function fakeAccuracy(initial: AccuracyState) {
  let state = initial
  const listeners = new Set<() => void>()
  const handle: AccuracyHandle & {
    start: Mock<() => void>
    stop: Mock<() => void>
    reload: Mock<() => void>
  } = {
    ready: Promise.resolve(),
    state: () => state,
    start: vi.fn(),
    stop: vi.fn(),
    reload: vi.fn(),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
  return {
    handle,
    listeners,
    set(next: AccuracyState) {
      state = next
      for (const listener of listeners) listener()
    }
  }
}
