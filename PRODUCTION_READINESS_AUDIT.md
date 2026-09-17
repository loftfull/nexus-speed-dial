# Nexus Speed Dial — независимый аудит production-readiness

Дата: 17 сентября 2026

## Методика

Проведён независимый review в четырёх ролях: product strategist, UX auditor, privacy/security reviewer и release engineer. Проверялись не только экраны, но и связи controls с поведением, persistence, imports, extension boundary, failure states, accessibility и позиционирование относительно bookmark/workspace-продуктов.

Это не сертификация безопасности и не полноценный Chromium E2E-аудит: браузерный visual pass в текущем окружении ещё не выполнен.

## Короткий вывод

Nexus уже выглядит как аккуратный visual speed dial, но пока не выглядит как законченный продукт категории «bookmark/workspace manager». Главный риск — не отсутствие ещё одной настройки, а разрыв между обещанием продукта и его реальной глубиной:

1. **Identity только частично migrated.** `SiteRecord.id` появился, но часть основного UI всё ещё keyed/operates by domain, title или prompt. Duplicate same-domain records могут конфликтовать.
2. **Некоторые controls являются декоративными или неполными.** `newTab`, `searchSuggestions`, `searchEngine`, `mobileMode`, Downloads и часть настроек не дают ожидаемого результата.
3. **Удалённые preview остаются внешней зависимостью.** Настройка теперь есть, но default включён, а политика не является «local-first by default».
4. **Продукт недостаточно отличается от красивой стартовой страницы.** У конкурентов сильнее capture, archive/offline, nested organization, dead-link handling, cross-device continuity и collaboration.
5. **Основные destructive/imperative interactions используют `prompt`, `confirm`, `alert`.** Это ломает ощущение production-полировки, accessibility и мобильный UX.
6. **Нет доказательства реальной production web compatibility.** Нужен Chromium pass с проверкой remote preview, popup/new-tab behavior, extension, narrow viewport и dark contrast.

Рекомендация: **не позиционировать как «лучший менеджер закладок» до закрытия P0/P1.** Реалистичное сильное позиционирование сейчас: *local-first visual start page with lightweight workspaces*.

## P0 — блокеры выхода на широкий рынок

### P0.1 Полностью завершить identity migration

**Наблюдение:** persisted `id` добавлен и migration проектов/сессий существует, но в `main.tsx`, `SiteTile` и части workspace flow остаются `domain`-based state, keys и callbacks. В `LibraryWorkspace` ещё используется title для части drag/action путей, а `SiteTile` и favorites dock keyed by domain. `domain` не является identity: два сохранённых URL с одним hostname могут быть разными записями.

**Риск:** редактирование, удаление, reorder, selection, history и restore могут затронуть не тот объект или оба объекта. Это data integrity issue, не косметика.

**Решение:** сделать `id: string` обязательным после migration; ввести `siteById`; заменить keys, selected state, reorder, favorite/delete/edit/open callbacks, drag payload и project/session references на ID. Domain оставить только display/dedup policy. Отдельно решить, разрешены ли две записи одного domain.

**Acceptance:** два сайта с одинаковым domain, но разными IDs, независимо редактируются, удаляются, сортируются, выбираются, попадают в разные projects и восстанавливаются из session/backup.

### P0.2 Доказать production behavior в Chromium

Нужен ручной или Playwright pass на desktop и mobile widths:

- clean install → default state;
- add/edit/delete site;
- duplicate domain/title;
- bookmark HTML import with categories/projects/tags;
- backup restore with legacy references;
- browser extension permission boundary;
- preview on/off and failed image;
- system theme switch while app is open;
- keyboard-only modal flow;
- refresh after every mutation;
- `Downloads` behavior or removal.

Current unit/build pass is necessary but not sufficient evidence.

### P0.3 Устранить несовпадение privacy promise и network behavior

Сейчас metadata Microlink gated by `localOnly`, screenshot provider controlled separately, weather uses Open-Meteo, and preview default remains enabled. A user who reads «локальное хранение» may reasonably miss that visiting a domain can trigger third-party requests.

**Решение:**

- default `remotePreviews: false` for strict local-first, либо explicit onboarding consent;
- показывать provider, URL purpose and data sent next to the switch;
- never claim «данные не отправляются»;
- add per-site “use remote preview” state;
- provide a local/no-network preview mode with icon/color/initials;
- document weather as external request too.

## P1 — проблемы, мешающие удобству и доверию

### P1.1 Удалить или реализовать dead controls

| Control/area | Проблема | Решение |
|---|---|---|
| `searchEngine` | выбор хранится, но основной поиск не использует выбранный provider | submit omnibox/palette query через выбранный URL template |
| `searchSuggestions` | setting заявляет suggestions, но network suggestion flow отсутствует | либо реализовать с explicit privacy notice, либо переименовать в «показывать поисковое действие» и убрать toggle |
| `newTab` | web app не может гарантировать browser new-tab behavior | вынести в extension settings и реально подключить extension, либо удалить из web settings |
| `mobileMode` | choice «Постоянно» не даёт очевидного layout behavior | реализовать media/layout mode или убрать option |
| Downloads | navigation item существует, но полноценного downloads model/UI нет | реализовать imported/downloaded resources либо убрать пункт |
| language/date | отображаются как settings-like rows, но не редактируются | сделать read-only product info или добавить реализацию |

Правило: каждый visible control должен менять наблюдаемое поведение, а не только localStorage.

### P1.2 Убрать native `prompt/confirm/alert`

Найдены imperative dialogs для category rename/add, delete site/project/session, import error и destructive reset. Они:

- плохо выглядят на мобильных устройствах;
- не соответствуют единому visual language;
- затрудняют focus/accessibility testing;
- не дают undo и понятного контекста.

Заменить на unified Dialog/ConfirmDialog/Toast с Undo для удаления, inline validation для rename/create и non-blocking import errors.

### P1.3 Снизить когнитивную перегрузку

Сейчас на одном продукте пересекаются: Speed Dial, Library, Projects, Sessions, Notes, Tags, Categories, Favorites, Browser Import, weather, calendar, backup, presets и настройки из большого числа секций. Для нового пользователя неясно:

- где хранить ссылку: category, tag, project или collection-like Library;
- чем project отличается от category;
- чем session отличается от project;
- зачем Notes отдельны от site note.

Нужна информационная модель в onboarding:

- **Site** — сохранённая ссылка;
- **Collection/Project** — рабочий контекст;
- **Tag** — cross-cutting label;
- **Session** — snapshot для восстановления;
- **Note** — annotation;
- **Category** — простой top-level filter.

Рассмотреть скрытие advanced areas до первого использования и переименование “Library” в более конкретное “Все материалы” или “Коллекция ссылок”.

### P1.4 Починить смысл workspace stats и empty states

`sites.length` показывается как число сайтов в workspace, хотя это может быть число всех сайтов. Project count может fallback-ить на category count. Это создаёт недоверие.

Каждая метрика должна иметь однозначный scope. Empty states должны объяснять первый action: «Добавить сайт», «Импортировать», «Установить extension».

### P1.5 Сделать backup/import transactional

Import сейчас смешивает sites, settings, projects и sessions несколькими state updates. При частичной ошибке возможен частично применённый backup; imported project references могут ссылаться на отсутствующие sites.

Нужен parse → validate → normalize IDs → preview → single apply transaction. Отдельно показывать skipped/unknown references и не импортировать silently broken workspace data.

## P2 — скрытые технические и продуктовые риски

### P2.1 Remote screenshot provider — availability and legal/product risk

`image.thum.io` делает UX зависимым от внешнего сервиса, rate limits, blocked sites, cache behavior и изменения API. Screenshot URL хранится как data, но не является permanent asset. Failure currently degrades to an empty/hidden image.

Нужны explicit provider abstraction, timeout/error state, retry, no-preview fallback, cache policy и documentation. Не обещать «автоматический preview» как durable feature без provider strategy.

### P2.2 Внешние данные и localization

Weather fetch не имеет visible retry control, offline cache или timestamp/error explanation. Default city — Москва, при Vienna user context это выглядит случайным и снижает trust. Не нужно использовать geolocation без согласия, но стоит выбрать neutral default или спросить город при первом запуске.

### P2.3 URL safety and navigation consistency

Есть много `window.open('https://'+domain)` и history/open paths. Нужна единая `normalizeAndValidateUrl`/`openSite` function: protocol handling, hostname validation, IDN/punycode policy, no accidental malformed URL, consistent `noopener,noreferrer`, and explicit handling of non-http imports.

### P2.4 Design system fragmentation

Несколько CSS layers (`styles`, `actions`, `settings`, `presets`, `visual-overrides`, product overrides) повышают риск cascade conflicts. Нужно зафиксировать tokens: spacing, radius, surfaces, text contrast, focus ring, motion, breakpoint. Затем удалить dead overrides.

### P2.5 Dark theme and contrast

Unit tests не проверяют contrast. Glass surfaces, muted text, badges, disabled buttons, icon-only controls и focus rings должны быть проверены на WCAG AA в light/dark, 200% zoom и forced colors.

### P2.6 Date/time correctness

Current clock/date calculated during render but no timer-driven minute update is visible from the code shape. Long-open tab может показывать stale time. Add a minute-aligned timer and test timezone/locale behavior.

### P2.7 Storage resilience

localStorage quota, corrupted JSON and schema versioning need explicit handling. `readStorage` fallback prevents crash, but silent fallback can look like data loss. Add schema version, recovery copy, export-before-reset and visible recovery toast.

## Что в продукте избыточно или бессмысленно сейчас

1. **Presets в большом количестве** до доказанной базовой retention: neon, glass, neumorphic, layered, aurora, elevated и другие увеличивают support/cascade surface, но не решают retrieval.
2. **Weather + calendar + profile/storage decoration** конкурируют с primary job — открыть нужную ссылку. Оставить weather optional; calendar должен иметь реальный value или исчезнуть.
3. **Fake profile “Алексей К.”** создаёт ощущение аккаунта, хотя продукта account/sync model нет. Заменить на “Локальный профиль” или убрать.
4. **Analytics toggle** без описанного telemetry implementation создаёт тревогу и лишний trust debt. Либо реализовать documented opt-in telemetry, либо убрать.
5. **Language/date rows** выглядят как controls, но не являются ими.
6. **“Browser sessions” wording** без гарантированной browser access может обещать больше, чем extension реально предоставляет.
7. **History back/forward buttons** в shell могут вести историю самого SPA/browser, а не history Nexus. Это неожиданный metaphor mismatch; если они не нужны для app navigation, убрать.
8. **Badge “5” у Почты** выглядит как live unread count, хотя это hard-coded demo data. Это особенно опасно для production trust.

## Что нужно добавить, чтобы реально конкурировать

Минимальный defensible advantage для local-first visual workspace:

1. one-click save from extension with selected project/tag/note;
2. reliable offline local previews and optional remote screenshots;
3. duplicate detection by URL plus explicit “same domain, different record” policy;
4. dead-link/check status with user-triggered scan;
5. nested projects or a clear two-level model;
6. fast global search by title/domain/tag/note, with selected provider behavior;
7. import/export that round-trips categories, tags, projects, sessions and IDs;
8. optional encrypted sync later, not implied today;
9. undo for destructive actions;
10. keyboard-first quick capture and restore.

Do **not** copy every competitor feature. Focus on “visual retrieval + local ownership + reliable work contexts”.

## Competitive gap

Current market summaries consistently position Raindrop around visual organization, tags, nested collections, full-text search, archives and cross-platform apps; Toby around visual tab/session organization; Start.me around customizable dashboards/widgets; Tixio around team workspaces. Sources:

- Tixio 2026 comparison: https://tixio.io/blog/best-bookmark-managers-2026
- Morgen comparison of Raindrop/Toby and capture use cases: https://www.morgen.so/blog-posts/best-chrome-bookmark-extensions
- Save This One comparison: https://savethisone.com/blog/best-bookmarking-tools-2026

Nexus currently has the visual shell and local-first angle, but lacks enough depth in capture, retrieval reliability, archive/offline continuity, link health and cross-device story to win head-to-head. The visual polish is not itself a moat because Start.me and Raindrop already occupy that expectation.

## Release gate

Before calling the product market-ready:

- [ ] ID-based behavior is complete and tested with duplicate domains/titles.
- [ ] Every setting is either functional or removed.
- [ ] Privacy panel accurately lists every external request and default.
- [ ] No hard-coded fake unread/account data remains.
- [ ] Native prompts are replaced or justified.
- [ ] Backup/import is validated and transactional.
- [ ] Chromium desktop/mobile visual and keyboard pass is recorded.
- [ ] Dark/light contrast and 200% zoom pass is recorded.
- [ ] Offline/error states for weather, preview and storage are tested.
- [ ] Product positioning is narrowed to a defensible promise.

## Verdict

**Current status: strong prototype / early beta, not yet production-ready as a market-leading analogue.**

The biggest next investment should not be another visual preset. It should be a focused reliability sprint: complete ID migration, remove dead controls, make privacy truthful, replace native dialogs, and run real Chromium QA. After that, build the one differentiator that the product can defend: local-first visual workspaces with fast, dependable capture and restore.
