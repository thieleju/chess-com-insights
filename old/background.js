chrome.runtime.onInstalled.addListener(() => {
  // default state goes here
  // this runs ONE TIME ONLY (unless the user reinstalls your extension)
  console.log("Extension installed");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Check if the URL has changed
    if (changeInfo.status !== "complete") return;

    // Exit if tab has no url, means it's not a host_permissions website
    if (!tab.url) return;

    // Get the active tab
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });

    // Send update message to content script
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "updateStats",
    });

    console.log(`Tab '${tabs[0].title}' updated`);
  } catch (error) {
    console.log(error);
  }
});
