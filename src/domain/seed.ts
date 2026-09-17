import type { Category, Project, SiteGroup, SiteRecord } from './types';

/** First-run content, shaped as Project → Category → Group. */
export const seedProjects: Project[] = [
  { id: 'project-home', name: 'Дом', color: '#3988ee', icon: 'Д', siteIds: [], createdAt: 0, updatedAt: 0 },
  { id: 'project-work', name: 'Работа', color: '#8b63e8', icon: 'Р', siteIds: [], createdAt: 0, updatedAt: 0 },
  { id: 'project-personal', name: 'Личное', color: '#2aa879', icon: 'Л', siteIds: [], createdAt: 0, updatedAt: 0 },
];

export const seedCategories: Category[] = [
  { id: 'cat-home-social', name: 'Соцсети', projectId: 'project-home' },
  { id: 'cat-home-fun', name: 'Развлечения', projectId: 'project-home' },
  { id: 'cat-work-tools', name: 'Инструменты', projectId: 'project-work' },
  { id: 'cat-work-dev', name: 'Разработка', projectId: 'project-work' },
  { id: 'cat-personal-finance', name: 'Финансы', projectId: 'project-personal' },
  { id: 'cat-personal-study', name: 'Обучение', projectId: 'project-personal' },
];

export const seedGroups: SiteGroup[] = [
  { id: 'grp-social-video', name: 'Видео', categoryId: 'cat-home-social' },
  { id: 'grp-social-chats', name: 'Чаты', categoryId: 'cat-home-social' },
  { id: 'grp-social-mail', name: 'Почта', categoryId: 'cat-home-social' },
  { id: 'grp-tools-design', name: 'Дизайн', categoryId: 'cat-work-tools' },
  { id: 'grp-tools-docs', name: 'Документы', categoryId: 'cat-work-tools' },
];

const site = (
  id: string, title: string, desc: string, domain: string, color: string, icon: string,
  categoryId: string, category: string, groupId?: string, extra: Partial<SiteRecord> = {},
): SiteRecord => ({ id, title, desc, domain, color, icon, categoryId, category, groupId, ...extra });

export const seedSites: SiteRecord[] = [
  site('site-youtube', 'YouTube', 'Видео и музыка', 'youtube.com', '#ff0033', '▶', 'cat-home-social', 'Соцсети', 'grp-social-video', { badge: '3' }),
  site('site-vk', 'ВКонтакте', 'Лента и сообщения', 'vk.com', '#0077ff', '❖', 'cat-home-social', 'Соцсети', 'grp-social-chats'),
  site('site-telegram', 'Telegram', 'Мессенджер', 'telegram.org', '#229ed9', '➤', 'cat-home-social', 'Соцсети', 'grp-social-chats', { badge: '12' }),
  site('site-mail', 'Почта', 'Входящие сообщения', 'mail.google.com', '#e94235', '✉', 'cat-home-social', 'Соцсети', 'grp-social-mail', { badge: '5' }),
  site('site-spotify', 'Spotify', 'Музыка для работы', 'spotify.com', '#1ed760', '◔', 'cat-home-fun', 'Развлечения'),
  site('site-dribbble', 'Dribbble', 'Вдохновение для дизайна', 'dribbble.com', '#ea4c89', '●', 'cat-home-fun', 'Развлечения'),
  site('site-figma', 'Figma', 'Дизайн и прототипирование', 'figma.com', '#f24e35', 'F', 'cat-work-tools', 'Инструменты', 'grp-tools-design', { favorite: true }),
  site('site-notion', 'Notion', 'Рабочее пространство', 'notion.so', '#191919', 'N', 'cat-work-tools', 'Инструменты', 'grp-tools-docs', { favorite: true }),
  site('site-drive', 'Google Drive', 'Файлы и документы', 'drive.google.com', '#4285f4', '△', 'cat-work-tools', 'Инструменты', 'grp-tools-docs'),
  site('site-github', 'GitHub', 'Репозитории и код', 'github.com', '#24292f', '◉', 'cat-work-dev', 'Разработка'),
  site('site-chatgpt', 'ChatGPT', 'Ваш AI-помощник', 'chatgpt.com', '#16a085', '✳', 'cat-work-dev', 'Разработка'),
  site('site-tinkoff', 'Т-Банк', 'Счета и платежи', 'tbank.ru', '#ffdd2d', 'Т', 'cat-personal-finance', 'Финансы'),
  site('site-sber', 'СберБанк', 'Онлайн-банк', 'sberbank.ru', '#21a038', 'С', 'cat-personal-finance', 'Финансы'),
  site('site-calendar', 'Мой календарь', 'Встречи и события', 'calendar.google.com', '#4285f4', '31', 'cat-personal-study', 'Обучение'),
  site('site-stepik', 'Stepik', 'Курсы и практика', 'stepik.org', '#66c85a', 'S', 'cat-personal-study', 'Обучение'),
];
