/**
 * This function is called when a chess.com tab is loaded.
 * It gets data from the public chess.com API and updates the DOM.
 */
function update_stats() {
  // get both chess players from the DOM
  const player_top_el = document.querySelector(
    ".board-layout-top .user-tagline-username"
  );
  const player_bottom_el = document.querySelector(
    ".board-layout-bottom .user-tagline-username"
  );

  if (!player_top_el || !player_bottom_el) return;

  // if elements with class flag-bottom and flag-top exist, remove them
  const flag_top = document.querySelector(".flag-top");
  const flag_bottom = document.querySelector(".flag-bottom");

  if (flag_top) flag_top.remove();
  if (flag_bottom) flag_bottom.remove();

  // create new elements and append them to the DOM
  el_top = document.createElement("div");
  el_top.classList.add("user-tagline-rating", "flag-top");
  el_top.style.marginLeft = "10px";
  player_top_el.parentElement.appendChild(el_top);

  el_bottom = document.createElement("div");
  el_bottom.classList.add("user-tagline-rating", "flag-bottom");
  el_bottom.style.marginLeft = "10px";
  player_bottom_el.parentElement.appendChild(el_bottom);

  // el_top.innerText = "Updating...";
  // el_bottom.innerText = "Updating...";

  // get stats for players and update ui elements
  // if error occurs, remove elements from DOM and update again
  get_chess_data(player_top_el.innerText)
    .then((data) => update_element(el_top, data))
    .catch(() => {
      el_top.remove();
      update_stats();
    });

  get_chess_data(player_bottom_el.innerText)
    .then((data) => update_element(el_bottom, data))
    .catch(() => {
      el_bottom.remove();
      update_stats();
    });
}

/**
 * Updates an element with the provided stats.
 * @param {HTMLElement} el - The element to update.
 * @param {Object} stats - The stats data to display.
 */
function update_element(el, stats) {
  let str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`;
  if (stats.accuracy.avg !== 0) str += ` (${stats.accuracy.avg}%)`;
  el.innerText = str;
}

/**
 * Fetches chess data for the given username from the chess.com public API.
 * @param {string} username - The username to fetch data for.
 * @returns {Promise<Object>} - The fetched chess data.
 */
async function get_chess_data(username) {
  // prepare date
  const date = new Date();
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  if (month < 10) month = `0${month}`;

  // get data from chess.com public API
  const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;
  const response = await fetch(url);
  const data = await response.json();

  // get settings from storage
  const settings = await getSettingsFromStorage();

  // filter and get stats
  const games_filtered = await filter_games(data.games, settings);
  const stats = get_stats(games_filtered, username);
  return stats;
}

/**
 * Calculates and returns the statistics for the given games and username.
 * @param {Array} games - The games data to calculate stats from.
 * @param {string} username - The username to calculate stats for.
 * @returns {Object} - The calculated statistics.
 */
function get_stats(games, username) {
  // count wld stats and sum up accuracy
  let accuracy_sum = 0;
  let stats = {
    wld: { wins: 0, loses: 0, draws: 0, games: games.length },
    accuracy: { avg: 0, games: games.length },
  };
  games.forEach((game) => {
    // get which side the player is playing on
    let color = "";
    if (game.white.username.toLowerCase() === username.toLowerCase())
      color = "white";
    else color = "black";

    // sum up the accuracy and check if the accuracy is available
    if (game.accuracies) accuracy_sum += game.accuracies[color];
    else stats.accuracy.games--;

    // get the result for wld
    const result = transform_result(game[color].result);
    switch (result) {
      case "win":
        stats.wld.wins++;
        break;
      case "lose":
        stats.wld.loses++;
        break;
      case "draw":
        stats.wld.draws++;
        break;
      default:
        console.log(`Unknown result: ${game[color].result}`);
    }
  });
  // calculate average accuracy and round to 2 decimal places
  stats.accuracy.avg = parseFloat(accuracy_sum / stats.accuracy.games).toFixed(
    2
  );
  // if accuracy is NaN, set it to 0
  if (isNaN(stats.accuracy.avg)) stats.accuracy.avg = 0;
  return stats;
}

/**
 * Filters the games based on the settings and returns the filtered games.
 * @param {Array} games - The games data to filter.
 * @param {Object} settings - The settings to apply for filtering.
 * @returns {Array} - The filtered games.
 */
function filter_games(games, settings) {
  // set defaults if settings are not available
  if (!settings.max_games || !settings.game_modes)
    settings = {
      max_games: 20,
      game_modes: ["blitz", "rapid", "bullet"],
    };

  // Sort games by end time in descending order
  games.sort((a, b) => b.end_time - a.end_time);

  // Filter games by game mode and limit the count to max_games
  return games
    .filter((game) => {
      return (
        (Array.isArray(settings.game_modes) &&
          settings.game_modes.includes(game.time_class)) ||
        game.time_class === settings.game_modes
      );
    })
    .slice(0, settings.max_games);
}

/**
 * Transforms the given result into a simplified result.
 * @param {string} result - The result to transform.
 * @returns {string} - The transformed result.
 */
function transform_result(result) {
  let r = "";
  switch (result) {
    case "win":
      r = "win";
      break;
    case "lose":
    case "checkmated":
    case "resigned":
    case "timeout":
    case "abandoned":
    case "bughousepartnerlose":
      r = "lose";
      break;
    case "agreed":
    case "timevsinsufficient":
    case "repetition":
    case "stalemate":
    case "insufficient":
    case "50move":
      r = "draw";
      break;
    default:
      console.log(`Cannot transform unknown result: ${result}`);
  }
  return r;
}

/**
 * Retrieves the settings from the storage.
 * @returns {Promise<Object>} - The settings data.
 */
async function getSettingsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["coi_settings"], (result) => {
      let coi_settings = {};
      if (result.coi_settings) coi_settings = result.coi_settings;
      resolve(coi_settings);
    });
  });
}

// initial run after 2 seconds to make sure the elements are loaded
setTimeout(update_stats, 2000);
