/**
 * This file is injected into matching chess.com tabs.
 */

import package_json from "../../package.json";
import { update_stats_both } from "./utils";
import { UrlObserver } from "./UrlObserver";
import { LOAD_DELAY } from "../../settings.json";

// Create a MutationObserver for observing URL changes
const urlobserver = new UrlObserver(LOAD_DELAY);

// start observing URL changes
urlobserver.startObserving();

console.log(`⚡ Chess.com Insights v${package_json.version} injected`);
console.log(`🚀 View source code at ${package_json.repository.url}`);

/**
 * Initial update of chess statistics
 */
setTimeout(() => {
  update_stats_both();
}, LOAD_DELAY);

/**
 * Handle click event on flip board button
 */
const flip_board_btn = document.getElementById("board-controls-flip");
if (flip_board_btn)
  flip_board_btn.addEventListener("click", () => update_stats_both());

/**
 * Listen for update events from the options page
 */
chrome.runtime.onMessage.addListener(async function (
  request: { action: string },
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (arg0: any) => void
) {
  if (request.action !== "updated-settings") return;

  update_stats_both(true);
});
