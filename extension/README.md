# Nexus Workspace Bridge

Минимальное Manifest V3 extension для явного чтения открытых вкладок браузера.

## Установка для разработки

1. Откройте `chrome://extensions` или `edge://extensions`.
2. Включите Developer mode.
3. Нажмите **Load unpacked**.
4. Выберите папку `extension/` из репозитория Nexus.
5. Скопируйте 32-символьный **ID** карточки `Nexus Workspace Bridge`.
6. Откройте Nexus в разрешённом origin.
7. В Nexus откройте **Настройки → Данные → Подключение браузера**, вставьте ID расширения и нажмите **Проверить**.
8. После статуса `Extension подключён` нажмите **Запросить открытые вкладки**.

ID расширения — это локальный идентификатор Chrome/Edge, а не пароль, токен или OAuth-код.

## Протокол

### Проверка подключения

Web-приложение отправляет:

```js
chrome.runtime.sendMessage(EXTENSION_ID, {
  type: 'NEXUS_PING',
  requestId: crypto.randomUUID()
}, response => {
  console.log(response)
})
```

Extension отвечает:

```ts
{
  type: 'NEXUS_PONG',
  requestId
}
```

### Чтение открытых вкладок

Web-приложение отправляет:

```js
chrome.runtime.sendMessage(EXTENSION_ID, {
  type: 'NEXUS_REQUEST_TABS',
  requestId: crypto.randomUUID()
}, response => {
  console.log(response.tabs)
})
```

Ответ содержит только вкладки с `http`, `https` и `ftp` URL:

```ts
{
  id, windowId, title, url, favIconUrl,
  active, pinned, index
}
```

Nexus импортирует в текущую модель сайтов только `http`/`https`; `ftp` может отображаться в preview, но не преобразуется в `SiteRecord`.

Extension не читает содержимое страниц и не использует `<all_urls>`. Доступ к вкладкам происходит только после явного запроса Nexus. Разрешённые внешние origin ограничены `localhost`, `127.0.0.1` и `*.e2b.app`.
