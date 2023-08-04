/**
 * This file is injected into chess.com tabs.
 * It initializes the stats updater and logs some info to the console.
 */

import package_json from "../../package.json"
import { StatsUpdater } from "../modules/StatsUpdater"

console.log(`⚡ Chess.com Insights v${package_json.version} injected`)
console.log(`🚀 View source code at ${package_json.repository.url}`)

/**
 * Initialize the stats updater
 */
const statsUpdater = new StatsUpdater()
statsUpdater.initialize()
