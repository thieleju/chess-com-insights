import {
  updateElement,
  getChessData,
  createInfoElement,
  getSettingsFromStorage,
} from "./utils";

import { Settings } from "../types/stats";

let settings: Settings;

const q_target_top = ".board-layout-top .user-tagline-username";
const q_target_bottom = ".board-layout-bottom .user-tagline-username";

console.log("--- Chess.com Insights injected ---");

/**
 * Create observer for username changes
 */
let prevContentTop = "";
let prevContentBottom = "";
const observer_usernames = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type !== "childList") return;
    const target = mutation.target as HTMLElement;
    const currentContent = target.innerHTML;
    if (target === target_top && currentContent !== prevContentTop) {
      // console.log("Changed content (top):", currentContent);
      update_stats("top");
      prevContentTop = currentContent;
    } else if (
      target === target_bottom &&
      currentContent !== prevContentBottom
    ) {
      // console.log("Changed content (bottom):", currentContent);
      update_stats("bottom");
      prevContentBottom = currentContent;
    }
  }
});

// Get username elements to observe
const target_top = document.querySelector(q_target_top) as HTMLElement;
const target_bottom = document.querySelector(q_target_bottom) as HTMLElement;

// Apply observer to username elements
if (target_top) observer_usernames.observe(target_top, { childList: true });
if (target_bottom)
  observer_usernames.observe(target_bottom, { childList: true });

let prevPathname = window.location.pathname; // Variable to store the previous URL path

/**
 * Function called on DOM mutations to check for URL changes
 * @param mutationsList List of mutations
 * @param _observer MutationObserver object
 */
function checkURLMutation(
  mutationsList: MutationRecord[],
  _observer: MutationObserver
) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList" || mutation.type === "attributes") {
      const currentPathname = window.location.pathname;

      if (currentPathname !== prevPathname) {
        // Manually update stats on page load
        update_stats("top");
        update_stats("bottom");
        prevPathname = currentPathname; // Update the previous URL path
      }
    }
  }
}

// Create a MutationObserver
const observer_url = new MutationObserver(checkURLMutation);

// Start observing DOM mutations
observer_url.observe(document.body, {
  childList: true,
  attributes: true,
  subtree: true,
});

setTimeout(() => {
  update_stats("top");
  update_stats("bottom");
}, 100);

/**
 * Update player statistics
 * @param player Player to update statistics for ('top' or 'bottom')
 * @param update_settings Flag indicating whether to update settings
 */
async function update_stats(player: "top" | "bottom", update_settings = false) {
  // Update settings if not already loaded or if update_settings is true
  if (!settings || update_settings) settings = await getSettingsFromStorage();

  const flag = document.querySelector(
    player === "top" ? ".flag-1" : ".flag-2"
  ) as HTMLElement;

  if (flag) flag.remove();

  if (!settings.show_stats) return;
  if (settings.hide_own_stats && player === "bottom") return;

  const player_el = document.querySelector(
    player === "top" ? q_target_top : q_target_bottom
  ) as HTMLElement;

  if (!player_el) return;

  const info_el = createInfoElement(
    player === "top" ? "flag-1" : "flag-2",
    `info-el-${player}`
  );

  player_el.parentElement?.appendChild(info_el);

  // Get stats for the player and update UI elements
  // If an error occurs, remove the element from DOM and update again
  try {
    const chess_data = await getChessData(player_el.innerText, settings);
    updateElement(
      info_el,
      chess_data,
      settings.show_accuracy,
      settings.color_highlighting
    );
  } catch (_err) {
    info_el.remove();
  }
}

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
