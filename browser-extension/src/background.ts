// Background service script for AnimeSphere Firefox extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-in-animesphere",
    title: "Открыть в AnimeSphere",
    contexts: ["page", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (info.menuItemId === "open-in-animesphere") {
    const url = info.linkUrl || info.pageUrl || tab?.url;
    if (url) {
      // Trigger protocol handler by opening custom URL scheme in a temporary background tab
      chrome.tabs.create({ url: `animesphere://play?url=${encodeURIComponent(url)}`, active: false }, (newTab: chrome.tabs.Tab) => {
        setTimeout(() => {
          if (newTab && newTab.id) {
            chrome.tabs.remove(newTab.id).catch(() => {});
          }
        }, 1500);
      });
    }
  }
});
