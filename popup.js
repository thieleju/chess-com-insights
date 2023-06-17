async function initializePopup() {
  // read settings from storage
  let coi_settings = await getSettingsFromStorage();

  // show settings in popup
  document.getElementById("games_max").textContent = coi_settings.games_max;
  document.getElementById("game_modes").textContent = coi_settings.game_modes;
}

document.addEventListener("DOMContentLoaded", initializePopup);

async function getSettingsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["coi_settings"], (result) => {
      let coi_settings = {};
      if (result.coi_settings) coi_settings = result.coi_settings;
      resolve(coi_settings);
    });
  });
}
