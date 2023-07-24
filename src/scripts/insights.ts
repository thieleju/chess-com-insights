/**
 * This file is injected into chess.com tabs.
 */

import package_json from "../../package.json";
import { update_stats } from "./utils";
import { UrlObserver } from "./UrlObserver";
import { LOAD_DELAY } from "../../settings.json";

// Create a MutationObserver for observing URL changes
const urlobserver = new UrlObserver(LOAD_DELAY);

// start observing URL changes
urlobserver.startObserving();

console.log(`--- Chess.com Insights v${package_json.version} injected ---`);

/**
 * Initial update of chess statistics
 */
setTimeout(() => {
  update_stats("top");
  update_stats("bottom");
}, LOAD_DELAY);

/**
 * Listen for update events from the options page
 */
chrome.runtime.onMessage.addListener(async function (
  request: { action: string },
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (arg0: any) => void
) {
  if (request.action !== "updated-settings") return;

  update_stats("top", true);
  update_stats("bottom", true);
});

/**
 * Handle click event on flip board button
 */
const flip_board_btn = document.getElementById("board-controls-flip");

if (flip_board_btn) {
  flip_board_btn.addEventListener("click", () => {
    const info1 = document.getElementById("info-el-top")?.innerHTML;
    const info2 = document.getElementById("info-el-bottom")?.innerHTML;

    const el1 = document.getElementById("info-el-top");
    const el2 = document.getElementById("info-el-bottom");
    if (el1) el1.innerHTML = info2 || "";
    if (el2) el2.innerHTML = info1 || "";
  });
}
