import {
  GAME_MODES,
  PILL_SIZES,
  SCORE_ORDERS,
  STATS_STYLES,
  TIME_INTERVALS,
  type Settings,
  type TimeInterval
} from "../lib/settings"
import { capitalize, el, scoreLabel } from "./el"

type BooleanKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never
}[keyof Settings]

const TOGGLES: { key: BooleanKey; label: string; needsStats?: boolean }[] = [
  { key: "show_stats", label: "Show stats" },
  {
    key: "show_accuracy",
    label: "Show accuracy of analyzed games",
    needsStats: true
  },
  { key: "show_device", label: "Show device icon", needsStats: true },
  { key: "color_highlighting", label: "Color highlighting", needsStats: true },
  { key: "hide_own_stats", label: "Hide own stats", needsStats: true },
  {
    key: "show_account_age",
    label: "Warn about new accounts",
    needsStats: true
  }
]

/**
 * Settings form shared by the extension popup and the in-page settings panel
 */
export function createSettingsForm(
  initial: Settings,
  onChange: (settings: Settings) => void
): HTMLElement {
  let settings: Settings = { ...initial, game_modes: [...initial.game_modes] }
  const form = el("div", "ccs-form")

  const render = () => {
    const disabled = !settings.show_stats
    form.replaceChildren(
      ...TOGGLES.map(({ key, label, needsStats }) =>
        toggle(label, settings[key], !!needsStats && disabled, (value) =>
          update({ [key]: value })
        )
      ),
      field(
        "Modes",
        segmented(
          GAME_MODES.map((mode) => ({ value: mode, label: capitalize(mode) })),
          (mode) => settings.game_modes.includes(mode),
          (mode) => {
            const active = settings.game_modes.includes(mode)
            // at least one mode has to stay selected
            if (active && settings.game_modes.length === 1) return
            update({
              game_modes: GAME_MODES.filter((m) =>
                m === mode ? !active : settings.game_modes.includes(m)
              )
            })
          },
          disabled
        )
      ),
      field(
        "Score",
        segmented(
          SCORE_ORDERS.map((order) => ({
            value: order,
            label: scoreLabel(order)
          })),
          (order) => settings.score_order === order,
          (order) => update({ score_order: order }),
          disabled
        )
      ),
      field(
        // makes clear the score only covers this period
        `${scoreLabel(settings.score_order)} period`,
        select(settings.time_interval, disabled, (value) =>
          update({ time_interval: value })
        )
      ),
      field(
        "Style",
        segmented(
          STATS_STYLES.map((style) => ({
            value: style,
            label: capitalize(style)
          })),
          (style) => settings.stats_style === style,
          (style) => update({ stats_style: style }),
          disabled
        )
      ),
      field(
        "Size",
        segmented(
          PILL_SIZES.map((size) => ({
            value: size,
            label: size.charAt(0).toUpperCase()
          })),
          (size) => settings.pill_size === size,
          (size) => update({ pill_size: size }),
          disabled
        )
      )
    )
  }

  const update = (patch: Partial<Settings>) => {
    settings = { ...settings, ...patch }
    render()
    onChange(settings)
  }

  render()
  return form
}

function toggle(
  label: string,
  checked: boolean,
  disabled: boolean,
  onInput: (value: boolean) => void
) {
  const input = el("input", "ccs-switch-input")
  input.type = "checkbox"
  input.setAttribute("role", "switch")
  input.checked = checked
  input.disabled = disabled
  input.addEventListener("change", () => onInput(input.checked))
  return el(
    "label",
    disabled ? "ccs-switch is-disabled" : "ccs-switch",
    el("span", undefined, label),
    input,
    el("span", "ccs-switch-track")
  )
}

function field(label: string, control: HTMLElement) {
  return el("div", "ccs-field", el("span", "ccs-field-label", label), control)
}

function segmented<T extends string>(
  options: { value: T; label: string }[],
  isActive: (value: T) => boolean,
  onClick: (value: T) => void,
  disabled: boolean
) {
  const group = el("div", "ccs-segmented")
  group.setAttribute("role", "group")
  for (const option of options) {
    const button = el(
      "button",
      isActive(option.value) ? "is-active" : undefined,
      option.label
    )
    button.type = "button"
    button.disabled = disabled
    button.setAttribute("aria-pressed", String(isActive(option.value)))
    button.addEventListener("click", () => onClick(option.value))
    group.append(button)
  }
  return group
}

function select(
  value: TimeInterval,
  disabled: boolean,
  onInput: (value: TimeInterval) => void
) {
  const input = el("select", "ccs-select")
  for (const interval of Object.keys(TIME_INTERVALS) as TimeInterval[]) {
    const option = el("option", undefined, capitalize(interval))
    option.value = interval
    option.selected = interval === value
    input.append(option)
  }
  input.disabled = disabled
  input.addEventListener("change", () => onInput(input.value as TimeInterval))
  return input
}
