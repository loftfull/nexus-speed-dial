# Аудит готовых DESIGN.md на GitHub и что из них взято

Дата: 19 сентября 2026.

## Что искалось и что нашлось

`DESIGN.md` — соглашение, по которому дизайн-система описывается одним
markdown-файлом с YAML-токенами в шапке и объяснением в теле, чтобы
кодирующий агент собирал интерфейс в нужном языке. Спецификация формата —
[google-labs-code/design.md](https://github.com/google-labs-code/design.md):
обязательные разделы идут в порядке Overview → Colors → Typography → Layout →
Elevation & Depth → Shapes → Components → Do's and Don'ts, токены
подставляются ссылками вида `{colors.primary}`.

Каталог разобранных систем —
[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md).
Я склонировал его в сессию и прочитал файлы целиком, а не по сводкам поиска:
в каталоге **74** системы. Для нашего приложения — запускалка со списком
плиток и палитрой команд — смотрел на семь ближайших по духу: `linear.app`,
`raycast`, `vercel`, `resend`, `apple`, `framer`, `superhuman`, `stripe`.

## Главный вывод: наша глубина была сделана устаревшим способом

Семь систем независимо сходятся на одном, и это прямо записано у них в
разделах «Elevation & Depth»:

| Система | Цитата |
|---|---|
| Linear | «Linear's depth is carried by surface ladder + hairline borders. The brand resists drop shadows on dark almost entirely.» |
| Raycast | «The system has no drop-shadow elevation at all. Depth is built entirely from the surface-color ladder… Don't add drop shadows on cards.» |
| Resend | «The system has **no traditional drop shadow language**. Every surface either gets a translucent-white hairline border or sits inside an atmospheric glow.» |
| Apple | «Apple uses **exactly one** drop-shadow, and it is applied to photographic product imagery — never to cards, never to buttons, never to text.» |
| Vercel | «The brand uses STACKED shadows — multiple small offsets layered to fake natural light — never a single 8-px-blur generic drop. **Inset hairline rings are always added so the card edge stays crisp.**» |
| Framer | уровень 2 — «`rgba(255,255,255,0.10)` 0.5px top edge + `rgba(0,0,0,0.25)` 0px 10px 30px drop» |

А у нас глубина держалась ровно на том, от чего они уходят: одна-две размытые
тени под карточкой и верхний блик плотностью **0.72** — глянец десятых годов.

## Что из этого внедрено

### 1. Кромка вместо размытия

Появилась внутренняя кромка — `inset 0 0 0 Npx rgba(...)` — и она добавляется
ко **всем** стилям тени, кроме рельефа, где спорила бы с зеркальными тенями.
Это тот самый «universal "you can see this card" cue» из разбора Vercel.
Три параметра в разделе «Материалы»: плотность кромки, плотность под курсором
(у Linear наведённая карточка встаёт на ступень выше) и толщина от **0.5 px** —
волосяная линия, как у Framer.

### 2. Стопка вместо одной тени

Стиль тени `stack` даёт три мелких смещения вместо одного размытого пятна —
приём Vercel. Он же стал стилем по умолчанию. Стиль `hairline` — вообще без
тени, только кромка: так работают Linear, Raycast и Resend.

### 3. Блик ослаблен с 0.72 до 0.12

Значение взято из уровня 2 Framer (`rgba(255,255,255,0.10)`) и описания Linear
(«subtle white edge highlight… gives the dark surface a faint "pixel rendered"
feel»).

### 4. Три новых готовых вида

* **«Ступень»** — подложка на ступень светлее полотна плюс кромка, тени нет
  (Linear / Raycast / Resend).
* **«Кромка»** — кромка, светлый край сверху и одна мелкая тень (Framer, ур. 2).
* **«Студия»** — стопка мелких смещений и кольцо (Vercel, ур. 4).

Всего готовых видов стало пятнадцать, и каждый обязан отличаться от остальных
на экране — это проверяется тестом.

### 5. Отделка самого приложения, а не только плиток

* Кольцо получили боковое окно, док, панель быстрого доступа, палитра,
  диалоги, карточки настроек и чипы избранного.
* Палитра и диалоги получили многослойную тень уровня «Modal» из разбора
  Vercel: `0 1px 1px`, `0 8px 16px -4px`, `0 24px 32px -8px` плюс кольцо.
* **Клавиши стали клавишами.** У Raycast это единственное украшение с
  глубиной: «subtle gradient-filled rounded keycap glyphs… with a faint
  linear gradient suggesting a physical key surface». Наши `Ctrl K`, `Esc`,
  `↑`, `↓` теперь с градиентом и кромкой.
* **Табличные цифры** для счётчиков, часов, значений ползунков и дней
  календаря — приём Stripe («every number rendering money, count, or
  transaction value uses `font-feature-settings: "tnum"`») и Coinbase.
* `font-feature-settings: "calt", "kern", "liga"` на всём приложении — общее
  место у Raycast, Vercel, Stripe, Apple и Resend.
* Отрицательный трекинг на крупной ступени: у Linear на 22–28 px это
  −0.4…−0.6 px.

## Чего намеренно не брал

* **Тёмная тема как единственная** (Raycast: «There is no light variant»).
  У нас обе темы уже есть, и отказываться от светлой — потеря.
* **Атмосферные радиальные свечения секций** (Resend) и **градиентная сетка**
  (Stripe, Vercel): это приёмы маркетинговых страниц, у нас рабочий экран,
  и цветное пятно за плитками мешало бы фирменным знакам сайтов.
* **Фирменные шрифты** (Linear Display, ABC Favorit, CoinbaseMono): они
  проприетарные. Взял то, что переносится, — трекинг, начертания и
  типографические функции.
* **Цветовые палитры чужих брендов**: копировать чужой фирменный цвет —
  не дизайн, а подделка. Взяты приёмы, а не чужая айдентика.

## Источники

* Спецификация формата: [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
* Каталог: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md),
  файлы `design-md/{linear.app,raycast,vercel,resend,apple,framer,superhuman,stripe}/DESIGN.md`
