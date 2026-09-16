# Nexus Workspace Bridge

Минимальное Manifest V3 extension для явного чтения открытых вкладок браузера.

## Установка для разработки

1. Откройте `chrome://extensions` или `edge://extensions`.
2. Включите Developer mode.
3. Нажмите Load unpacked.
4. Выберите эту папку `extension/`.
5. Откройте Nexus в разрешённом origin.

## Протокол

Web-приложение отправляет extension external message:

```js
chrome.runtime.sendMessage(EXTENSION_ID, {
  type: 'NEXUS_REQUEST_TABS',
  requestId: crypto.randomUUID()
}, response => {
  console.log(response.tabs)
});
```

Ответ содержит только вкладки с `http`, `https` и `ftp` URL:

```ts
{
  id, windowId, title, url, favIconUrl,
  active, pinned, index
}
```

Extension не читает содержимое страниц и не использует `<all_urls>`. Доступ к вкладкам происходит только после явного запроса Nexus.
