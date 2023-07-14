// import functions from utils.ts
import {
  updateElement,
  getChessData,
  createInfoElement,
  getSettingsFromStorage,
} from "./utils";

import { Settings } from "../types/stats";

let settings: Settings;

async function update_stats() {
  const player_el_1 = document.querySelector(
    ".board-layout-top .user-tagline-username"
  ) as HTMLElement;
  const player_el_2 = document.querySelector(
    ".board-layout-bottom .user-tagline-username"
  ) as HTMLElement;

  if (!player_el_1 || !player_el_2) return;

  if (
    player_el_1.innerText.toLowerCase() === "opponent" ||
    player_el_2.innerText.toLowerCase() === "opponent"
  ) {
    setTimeout(update_stats, 1000);
    return;
  }

  const flag_1 = document.querySelector(".flag-1") as HTMLElement;
  const flag_2 = document.querySelector(".flag-2") as HTMLElement;

  if (flag_1) flag_1.remove();
  if (flag_2) flag_2.remove();

  const info_el_1 = createInfoElement("flag-1", "info-el-1");
  const info_el_2 = createInfoElement("flag-2", "info-el-2");

  player_el_1.parentElement?.appendChild(info_el_1);
  player_el_2.parentElement?.appendChild(info_el_2);

  // get stats for players and update ui elements
  // if error occurs, remove elements from DOM and update again
  getChessData(player_el_1.innerText, settings)
    .then((data) => {
      // console.log("data p1", data);
      updateElement(info_el_1, data);
    })
    .catch((_err) => {
      info_el_1.remove();
      setTimeout(update_stats, 1000);
    });

  getChessData(player_el_2.innerText, settings)
    .then((data) => {
      // console.log("data p2", data);
      updateElement(info_el_2, data);
    })
    .catch((_err) => {
      info_el_2.remove();
      setTimeout(update_stats, 1000);
    });
}

// handle click event on flip board button
const flip_board_btn = document.getElementById("board-controls-flip");

if (flip_board_btn) {
  flip_board_btn.addEventListener("click", () => {
    const info1 = document.getElementById("info-el-1")?.innerHTML;
    const info2 = document.getElementById("info-el-2")?.innerHTML;

    const el1 = document.getElementById("info-el-1");
    const el2 = document.getElementById("info-el-2");
    if (el1) el1.innerHTML = info2 || "";
    if (el2) el2.innerHTML = info1 || "";
  });
}

// receive update events from background script
chrome.runtime.onMessage.addListener(async function (
  request: { action: string },
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (arg0: any) => void
) {
  if (request.action !== "updateStats") return;

  // clear current stats if available
  const info1 = document.getElementById("info-el-1");
  const info2 = document.getElementById("info-el-2");
  if (info1) info1.innerHTML = "";
  if (info2) info2.innerHTML = "";

  // get settings from extension local storage
  let s: Settings = await getSettingsFromStorage();
  settings = s;

  // wait 1.5 seconds for site to load usernames
  setTimeout(update_stats, 1500);
});
