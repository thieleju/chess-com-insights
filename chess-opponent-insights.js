async function execute() {
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

  // get parent elements
  let el_top = player_top_el.querySelector(".user-tagline-rating");
  let el_bottom = player_bottom_el.querySelector(".user-tagline-rating");

  // create new elements and append them to the DOM
  el_top = document.createElement("div");
  el_top.classList.add("user-tagline-rating", "flag-top");
  el_top.style.marginLeft = "10px";
  player_top_el.parentElement.appendChild(el_top);

  el_bottom = document.createElement("div");
  el_bottom.classList.add("user-tagline-rating", "flag-bottom");
  el_bottom.style.marginLeft = "10px";
  player_bottom_el.parentElement.appendChild(el_bottom);

  el_top.innerText = "Loading...";
  el_bottom.innerText = "Loading...";

  // request data from chess.com public API
  let stats_top, stats_bottom;
  try {
    stats_top = await get_chess_data(player_top_el.innerText);
    stats_bottom = await get_chess_data(player_bottom_el.innerText);
  } catch (err) {
    // if error occurs, remove elements from DOM and execute again
    el_top.remove();
    el_bottom.remove();
    execute();
    return;
  }

  // update the stats in the DOM
  let str_top = `${stats_top.wld.wins}/${stats_top.wld.loses}/${stats_top.wld.draws}`;
  let str_bottom = `${stats_bottom.wld.wins}/${stats_bottom.wld.loses}/${stats_bottom.wld.draws}`;

  // if the accuracy is available, add it to the string
  if (stats_top.accuracy.avg !== 0) str_top += ` (${stats_top.accuracy.avg}%)`;
  if (stats_bottom.accuracy.avg !== 0)
    str_bottom += ` (${stats_bottom.accuracy.avg}%)`;

  el_top.innerText = str_top;
  el_bottom.innerText = str_bottom;
}

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

  // filter and get stats
  const games_filtered = filter_games(data.games);
  const stats = get_stats(games_filtered, username);
  return stats;
}

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

function filter_games(games) {
  const game_modes = ["rapid", "blitz", "bullet"];
  const max_games = 20;

  // Sort games by end time in descending order
  games.sort((a, b) => b.end_time - a.end_time);

  // Filter games by game mode and limit the count to max_games
  return games
    .filter((game) => {
      return (
        (Array.isArray(game_modes) && game_modes.includes(game.time_class)) ||
        game.time_class === game_modes
      );
    })
    .slice(0, max_games);
}

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

// initial run after 2.2 seconds to make sure the elements are loaded
setTimeout(execute, 2200);
