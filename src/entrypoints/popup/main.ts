import "../../ui/style.css"
import "./style.css"

import { browser } from "wxt/browser"

import { REPOSITORY_URL } from "../../lib/config"
import { loadSettings, saveSettings, type Settings } from "../../lib/settings"
import { ICONS, el, icon } from "../../ui/el"
import { createSettingsForm } from "../../ui/settings-form"

function iconButton(
  paths: string[],
  label: string,
  onClick: () => void
): HTMLButtonElement {
  const button = el("button", "ccs-icon-button", icon(paths))
  button.type = "button"
  button.title = label
  button.setAttribute("aria-label", label)
  button.addEventListener("click", onClick)
  return button
}

async function main(): Promise<void> {
  let settings: Settings = await loadSettings()
  const app = document.getElementById("app")!

  const save = (next: Settings) => {
    settings = next
    // open chess.com tabs pick this up through storage.onChanged
    void saveSettings(settings)
  }

  const applyTheme = () => {
    document.documentElement.classList.toggle(
      "is-light",
      !settings.popup_darkmode
    )
    themeButton.replaceChildren(
      icon(settings.popup_darkmode ? ICONS.moon : ICONS.sun)
    )
  }

  const themeButton = iconButton(ICONS.moon, "Toggle dark mode", () => {
    save({ ...settings, popup_darkmode: !settings.popup_darkmode })
    applyTheme()
  })

  const logo = el("img", "ccs-logo")
  logo.src = "/icons/icon48.png"
  logo.alt = ""

  let version = ""
  try {
    version = `v${browser.runtime.getManifest().version}`
  } catch {
    // not running as an extension
  }

  app.replaceChildren(
    el(
      "header",
      "ccs-header",
      logo,
      el("strong", "ccs-title-text", "Chess Stats"),
      themeButton,
      iconButton(ICONS.github, "Open GitHub repository", () =>
        window.open(REPOSITORY_URL, "_blank")
      )
    ),
    el(
      "section",
      "ccs-section",
      createSettingsForm(settings, (next) =>
        save({ ...next, popup_darkmode: settings.popup_darkmode })
      )
    ),
    el("footer", "ccs-footer", el("span", undefined, version))
  )
  applyTheme()
}

void main()
