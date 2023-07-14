/**
 * This function is called when a chess.com tab is loaded.
 * It gets data from the public chess.com API and updates the DOM.
 */
function update_stats() {
  // get player elements from dom
  const player_el_1 = document.querySelector(
    ".board-layout-top .user-tagline-username"
  );
  const player_el_2 = document.querySelector(
    ".board-layout-bottom .user-tagline-username"
  );

  if (!player_el_1 || !player_el_2) return;

  // in case the ui elements are not updated yet, try again after 1 second
  if (
    player_el_1.innerText.toLowerCase() === "opponent" ||
    player_el_2.innerText.toLowerCase() === "opponent"
  ) {
    setTimeout(update_stats, 1000);
    return;
  }

  // if elements with class flag-2 and flag-1 exist, remove them
  const flag_1 = document.querySelector(".flag-1");
  const flag_2 = document.querySelector(".flag-2");

  // if elements with class flag-2 and flag-1 exist, remove them
  if (flag_1) flag_1.remove();
  if (flag_2) flag_2.remove();

  let info_el_1 = document.createElement("div");
  info_el_1.classList.add("user-tagline-rating", "flag-1");
  info_el_1.id = "info-el-1";
  info_el_1.style.marginLeft = "10px";
  player_el_1.parentElement.appendChild(info_el_1);

  let info_el_2 = document.createElement("div");
  info_el_2.classList.add("user-tagline-rating", "flag-2");
  info_el_2.id = "info-el-2";
  info_el_2.style.marginLeft = "10px";
  player_el_2.parentElement.appendChild(info_el_2);

  // get stats for players and update ui elements
  // if error occurs, remove elements from DOM and update again
  get_chess_data(player_el_1.innerText)
    .then((data) => update_element(info_el_1, data))
    .catch((err) => {
      info_el_1.remove();
      setTimeout(update_stats, 1000);
    });

  get_chess_data(player_el_2.innerText)
    .then((data) => update_element(info_el_2, data))
    .catch((err) => {
      info_el_2.remove();
      setTimeout(update_stats, 1000);
    });
}

/**
 * Updates an element with the provided stats.
 * @param {HTMLElement} el - The element to update.
 * @param {Object} stats - The stats data to display.
 */
function update_element(el, stats) {
  let str = `${stats.wld.wins}/${stats.wld.loses}/${stats.wld.draws}`;
  if (stats.accuracy.avg != 0) str += ` (${stats.accuracy.avg}%)`;
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
  let stats = {
    wld: { wins: 0, loses: 0, draws: 0, games: games.length },
    accuracy: { avg: 0, games: games.length },
  };

  games.forEach((game) => {
    const color =
      game.white.username.toLowerCase() === username.toLowerCase()
        ? "white"
        : "black";
    const accuracies = game.accuracies;

    if (accuracies) stats.accuracy.avg += accuracies[color] || 0;
    else stats.accuracy.games--;

    const result = transform_result(game[color].result);
    stats.wld[result + "s"]++;
  });

  // calculate average accuracy, round to 2 decimals and return 0 if something went wrong
  stats.accuracy.avg = parseFloat(
    stats.accuracy.avg / stats.accuracy.games
  ).toFixed(2);
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
      game_modes: ["blitz", "rapid", "bullet"],
      time_interval: "last 12 hours",
    };

  // Filter games by game mode and time_interval
  return games
    .filter((game) => {
      return (
        (Array.isArray(settings.game_modes) &&
          settings.game_modes.includes(game.time_class)) ||
        game.time_class === settings.game_modes
      );
    })
    .filter((game) => {
      return check_time_interval(game.end_time, settings.time_interval);
    });
}

/**
 * Checks if the given end time falls within the specified time interval.
 * @param {number} end_time - The end time of the game (in seconds).
 * @param {string} time_interval - The time interval to check against.
 * @returns {boolean} Returns true if the end time is within the specified time interval, otherwise false.
 */
function check_time_interval(end_time, time_interval) {
  const current_date = Math.floor(Date.now() / 1000);
  const time_intervals = {
    "last 1 hour": 3600,
    "last 6 hours": 21600,
    "last 12 hours": 43200,
    "last 24 hours": 86400,
  };

  if (end_time > current_date) return false;

  if (time_interval in time_intervals)
    return end_time > current_date - time_intervals[time_interval];

  if (time_interval === "today") {
    const current_day_seconds =
      new Date().getHours() * 3600 +
      new Date().getMinutes() * 60 +
      new Date().getSeconds();
    return end_time > current_date - current_day_seconds;
  }

  if (time_interval === "this month") return true;

  return false;
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
    chrome.storage.local.get(["settings"], (result) => {
      let settings = {};
      if (result.settings) settings = result.settings;
      resolve(settings);
    });
  });
}

// add eventlistener to flip board button
const flip_board_btn = document.getElementById("board-controls-flip");

if (flip_board_btn) {
  // when flip board button is clicked, flip the info elements
  flip_board_btn.addEventListener("click", () => {
    // get content of info elements
    const info1 = document.getElementById("info-el-1").innerHTML;
    const info2 = document.getElementById("info-el-2").innerHTML;
    // swap content of info elements
    document.getElementById("info-el-1").innerHTML = info2;
    document.getElementById("info-el-2").innerHTML = info1;
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "updateStats") {
    // clear current stats if available
    const info1 = document.getElementById("info-el-1");
    const info2 = document.getElementById("info-el-2");
    if (info1) info1.innerHTML = "";
    if (info2) info2.innerHTML = "";

    // wait 1.5 seconds for site to load usernames
    setTimeout(update_stats, 1500);
  }
});
