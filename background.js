const foreground_script = "chess-opponent-insights.js";

chrome.runtime.onInstalled.addListener(() => {
  // default state goes here
  // this runs ONE TIME ONLY (unless the user reinstalls your extension)
  console.log("Extension installed");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // check if the tab has finished loading
  if (changeInfo.status === "complete" && /^http/.test(tab.url)) {
    // inject the script and catch errors
    try {
      await inject_script(tabId, foreground_script);
    } catch (err) {
      console.log(err);
    }
  }
});

/**
 *  Inject a script into a tab
 * @param {number} tabId
 * @param {string} script_name
 */
async function inject_script(tabId, script_name) {
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: [`./${script_name}`],
  });
  // get title and print it to the console
  const tab_title = await get_tab_title(tabId);
  console.log(
    `Injected ${script_name} into tab '${tab_title}' with id '${tabId}'`
  );
}

/**
 * Get the title of the tab with the given tabId
 * @param {number} tabId
 * @returns {string} the title of the tab
 */
function get_tab_title(tabId) {
  return chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      function: () => document.title,
    })
    .then((title) => title[0].result);
}
