const allowedSchemes = /^(https?|ftp):/i;

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'NEXUS_REQUEST_TABS') return false;
  if (!sender.url || !/^https?:\/\/(localhost|127\.0\.0\.1|[^/]+\.e2b\.app)(\/|$)/i.test(sender.url)) {
    sendResponse({ type: 'NEXUS_TABS_RESPONSE', requestId: message.requestId, error: 'Origin is not allowed' });
    return false;
  }

  chrome.tabs.query({}).then(tabs => {
    sendResponse({
      type: 'NEXUS_TABS_RESPONSE',
      requestId: message.requestId,
      tabs: tabs.filter(tab => allowedSchemes.test(tab.url || '')).map(tab => ({
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title || tab.url,
        url: tab.url,
        favIconUrl: tab.favIconUrl || '',
        active: Boolean(tab.active),
        pinned: Boolean(tab.pinned),
        index: tab.index
      }))
    });
  }).catch(error => sendResponse({
    type: 'NEXUS_TABS_RESPONSE',
    requestId: message.requestId,
    error: String(error)
  }));
  return true;
});
