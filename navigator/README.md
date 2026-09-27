# Nexus Navigator 2.0

> **Premium Link Manager** — современный менеджер закладок с AI-обогащением и премиальным дизайном.

![Nexus Navigator](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61dafb.svg)

## ✨ Особенности

### 🎨 Премиальный дизайн
- **Glassmorphism UI** — современные стеклянные поверхности с backdrop-blur
- **Мягкие тени** — многоуровневая система теней для глубины
- **Воздушный интерфейс** — правильные отступы и скругления (28px для карточек)
- **Темная тема** — полная поддержка macOS Night и Auto Contrast режимов

### 🤖 AI-обогащение
- **Автозаполнение** — Microlink API для метаданных
- **Умные описания** — OpenAI GPT для генерации контента
- **Контроль качества** — четкие статусы ошибок и частичный успех
- **Безопасность** — локальное хранение ключей, маскировка в UI

### 📊 Умная организация
- **Проекты → Категории → Группы** — трехуровневая иерархия
- **Smart Collections** — динамические коллекции с правилами
- **Теги** — облако тегов с фильтрацией
- **Top Visited** — быстрый доступ к часто используемым

### ⚡ Производительность
- **Пагинация** — 50 сайтов за раз для больших библиотек
- **Виртуализация** — оптимизированный рендеринг
- **Lazy loading** — скриншоты и иконки по требованию
- **Offline-first** — работа без интернета

### 🔒 Надежность данных
- **Версионирование** — схема данных с миграциями
- **Авто-бэкап** — автоматическое резервное копирование
- **Undo/Redo** — отмена удалений
- **Импорт/Экспорт** — JSON с валидацией

## 🚀 Быстрый старт

### Установка

```bash
# Клонируйте репозиторий
git clone https://github.com/your-org/nexus-navigator.git

# Установите зависимости
cd nexus-navigator
npm install

# Запустите в режиме разработки
npm run dev
```

### Сборка для продакшена

```bash
# Создайте production сборку
npm run build

# Предварительный просмотр
npm run preview
```

## 🎯 Использование

### Добавление сайта

1. Нажмите **Add site** в правом верхнем углу
2. Введите URL и нажмите **Auto fill**
3. Система автоматически подтянет:
   - Название сайта
   - Описание
   - Иконку
   - Скриншот
   - Категория и теги (с AI)
4. Нажмите **Save**

### Умные коллекции

1. В сайдбаре нажмите **+ New Collection**
2. Задайте правила:
   - Только избранные
   - Только AI-обогащенные
   - Минимум посещений
   - Конкретный проект
   - Определенные теги
3. Коллекция автоматически обновляется

### Массовые действия

1. Нажмите **Select** в верхней панели
2. Выберите нужные сайты
3. Выполните действия:
   - **Delete N** — удалить выбранные
   - **Open N** — открыть во вкладках
   - **★/☆** — добавить/убрать из избранного
   - **Move to** — переместить в другую группу
4. Нажмите **Done** для завершения

### Keyboard Shortcuts

| Shortcut | Действие |
|----------|----------|
| `⌘ K` | Открыть поиск |
| `⌘ ,` | Открыть настройки |
| `1-9` | Быстрое открытие (первые 9 сайтов) |
| `Esc` | Закрыть модальные окна |

## 🎨 Дизайн-система

### Цвета

```css
/* Primary */
--blue-600: #2563eb
--blue-700: #1d4ed8

/* Success */
--amber-500: #f59e0b

/* Danger */
--rose-600: #e11d48

/* Neutral */
--slate-50: #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-500: #64748b
--slate-600: #475569
```

### Типографика

```css
/* Section headers */
font-size: 10px
font-weight: 600
text-transform: uppercase
letter-spacing: 0.22em
color: var(--slate-400)

/* Body */
font-size: 13px
font-weight: 500
color: var(--slate-600)

/* Large */
font-size: 16px
font-weight: 600
color: var(--slate-900)
```

### Компоненты

#### PremiumCard
```tsx
<PremiumCard className="custom-class">
  Content here
</PremiumCard>
```

#### PremiumButton
```tsx
<PremiumButton variant="primary" size="md">
  Click me
</PremiumButton>

// Variants: primary, secondary, ghost
// Sizes: sm, md, lg
```

#### PremiumBadge
```tsx
<PremiumBadge variant="active">
  Active
</PremiumBadge>

// Variants: default, active, neutral
```

## 📁 Структура проекта

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Drawer.tsx
│   ├── SiteCard.tsx
│   ├── TileMenu.tsx
│   ├── AddSiteModal.tsx
│   ├── PremiumLayout.tsx
│   └── ...
├── utils/
│   ├── cn.ts
│   └── helpers.ts
├── types.ts
├── App.tsx
└── main.tsx
```

## 🔧 Настройки

### AI API Key

1. Откройте **Settings** (⌘,)
2. В разделе **Automation** введите ваш OpenAI API ключ
3. Ключ хранится локально и никогда не отправляется на наш сервер

### Тема

- **macOS Light** — светлая тема по умолчанию
- **macOS Night** — темная тема
- **Auto Contrast** — высокая контрастность

### Плотность

- **Compact** — компактный вид
- **Comfortable** — просторный вид

## 🐛 Известные ограничения

1. **Скриншоты** — зависят от внешних сервисов (Microlink, thum.io)
2. **AI обогащение** — требует OpenAI API ключ и интернет
3. **Импорт** — максимум 1000 сайтов за раз для производительности

## 🤝 Вклад

Мы приветствуем вклад в развитие проекта!

1. Fork проекта
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License. Смотрите [LICENSE](LICENSE) для деталей.

##  Благодарности

- **Microlink** — за API метаданных
- **OpenAI** — за GPT модели
- **Vite** — за быстрый бандлер
- **Tailwind CSS** — за утиитарные классы

## 📞 Поддержка

Если у вас есть вопросы или предложения:
- Создайте [issue](https://github.com/your-org/nexus-navigator/issues)
- Отправьте PR с улучшениями

---

**Nexus Navigator 2.0** — Premium Link Manager © 2024
