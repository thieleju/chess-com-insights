async function initializePopup() {
  // read settings from storage
  let settings = await getSettingsFromStorage();

  // show settings in popup
  // document.getElementById("games_max").textContent = settings.games_max;
  document.getElementById("game_modes").textContent = settings.game_modes;
}

document.addEventListener("DOMContentLoaded", initializePopup);

async function getSettingsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => {
      let settings = {};
      if (result.settings) settings = result.settings;
      resolve(settings);
    });
  });
}
