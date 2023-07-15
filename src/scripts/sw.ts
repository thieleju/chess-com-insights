chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed");
  const manifest = chrome.runtime.getManifest();
  if (manifest.content_scripts) {
    for (const cs of manifest.content_scripts) {
      const tabs = await chrome.tabs.query({ url: cs.matches });
      for (const tab of tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: cs.js!,
        });
      }
    }
  }
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
