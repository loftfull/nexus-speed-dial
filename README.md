# nexus-speed-dial

Репозиторий содержит два независимых направления:

| Направление | Каталог | Статус |
|---|---|---|
| **Nexus Navigator** — менеджер закладок (React 19 + Vite + Tailwind 4) | [`navigator/`](navigator/) | v2.1.0, см. [README](navigator/README.md) и [CHANGELOG](navigator/CHANGELOG.md) |
| **Nexus Speed Dial** — Glass UI speed dial | [`docs/superpowers/`](docs/superpowers/) | спецификация и план Milestone 1; прототипы `speed_dial_v118.html`, `speed_dial_v126 (5).html` |

Направления не делят код, зависимости и CI: у Navigator собственный `package.json`
и workflow [`.github/workflows/navigator.yml`](.github/workflows/navigator.yml),
который запускается только при изменениях в `navigator/`.
