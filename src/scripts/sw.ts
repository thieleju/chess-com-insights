chrome.runtime.onInstalled.addListener(() => {
  // default state goes here
  // this runs ONE TIME ONLY (unless the user reinstalls your extension)
  console.log("Extension installed");
});

chrome.tabs.onUpdated.addListener(
  async (
    _tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    try {
      // Check if the URL has changed
      if (changeInfo.status !== "complete") return;

      // Exit if tab has no url, means it's not a host_permissions website
      if (!tab.url) return;

      // Send update message to content script
      const [activeTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      chrome.tabs.sendMessage(activeTab.id!, {
        action: "updateStats",
      });

      console.log(`Tab '${activeTab.title}' updated`);
    } catch (error) {
      console.log(error);
    }
  }
);
