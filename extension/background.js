const allowedSchemes = /^(https?|ftp):/i;
const allowedOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|[^/]+\.e2b\.app)(\/|$)/i;

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!sender.url || !allowedOrigin.test(sender.url)) {
    sendResponse({
      type: message?.type === 'NEXUS_PING' ? 'NEXUS_PONG' : 'NEXUS_TABS_RESPONSE',
      requestId: message?.requestId,
      error: 'Origin is not allowed'
    });
    return false;
  }

  if (message?.type === 'NEXUS_PING') {
    sendResponse({ type: 'NEXUS_PONG', requestId: message.requestId });
    return false;
  }

  if (message?.type !== 'NEXUS_REQUEST_TABS') return false;

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
