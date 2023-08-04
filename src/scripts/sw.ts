/**
 * This service worker injects the content scripts into all tabs that
 * match the content script's matches when the extension is installed/updated.
 *
 * This is necessary because content scripts are only injected into
 * tabs that are created after the extension is installed.
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed")

  // Get content scripts from manifest
  const manifest = chrome.runtime.getManifest()
  if (!manifest.content_scripts) return

  // loop through all content scripts
  for (const cs of manifest.content_scripts) {
    // get all tabs that match the content script's matches
    const tabs = await chrome.tabs.query({ url: cs.matches })

    // inject content script into all found tabs
    for (const tab of tabs) {
      console.log(`Injecting content script '${cs.js}' into tab '${tab.title}'`)
      chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        files: cs.js!
      })
    }
  }
})
