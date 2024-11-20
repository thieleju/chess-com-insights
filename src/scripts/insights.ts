/**
 * This file is injected into chess.com tabs.
 * It initializes the stats updater and logs some info to the console.
 */

import { version, repository } from "../../package.json"
import { StatsUpdaterFactory } from "../modules/StatsUpdaterFactory"
import { BrowserSettingsStorage } from "../modules/BrowserSettingsStorage"

console.log(`⚡ Chess.com Insights v${version} injected`)
console.log(`🚀 View source code at ${repository.url}`)

/**
 * Initialize the stats updater and start updating stats.
 */
StatsUpdaterFactory.createStatsUpdater(
  new BrowserSettingsStorage()
).initialize()
