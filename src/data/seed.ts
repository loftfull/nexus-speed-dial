import type { Category, Project, Site, Space } from '../domain/types.ts';
import { faviconUrlFor } from '../domain/siteIcon.ts';

export const seedSpaces: Space[] = [
  { id: 'home', name: 'Дом', icon: 'home', position: 0 },
  { id: 'work', name: 'Работа', icon: 'briefcase', position: 1 },
  { id: 'project', name: 'Проект', icon: 'folder-kanban', position: 2 },
];

/** @deprecated Transitional compatibility for the pre-Space UI. */
export const seedProjects: Project[] = seedSpaces.map(({ id, name, icon, position }) => ({ id, name, icon, position }));

const category = (input: Omit<Category, 'projectId'> & { spaceId: string }): Category => ({ ...input, projectId: input.spaceId });

export const seedCategories: Category[] = [
  category({ id: 'social', name: 'Социальные сети', spaceId: 'home', icon: 'users', position: 0 }),
  category({ id: 'communication', name: 'Общение', spaceId: 'home', parentId: 'social', icon: 'message-circle', position: 1 }),
  category({ id: 'news', name: 'Новости', spaceId: 'home', parentId: 'social', icon: 'newspaper', position: 2 }),
  category({ id: 'services', name: 'Сервисы', spaceId: 'home', icon: 'grid-2x2', position: 3 }),
  category({ id: 'productivity', name: 'Продуктивность', spaceId: 'home', icon: 'check-square', position: 4 }),
  category({ id: 'entertainment', name: 'Развлечения', spaceId: 'home', icon: 'play-circle', position: 5 }),
  category({ id: 'tools', name: 'Инструменты', spaceId: 'home', icon: 'wrench', position: 6 }),
  category({ id: 'shopping', name: 'Покупки', spaceId: 'home', icon: 'shopping-cart', position: 7 }),
  category({ id: 'finance', name: 'Финансы', spaceId: 'home', icon: 'badge-dollar-sign', position: 8 }),
  category({ id: 'development', name: 'Разработка', spaceId: 'work', icon: 'github', position: 0 }),
];

const site = (input: Omit<Site, 'projectId'> & { spaceId: string }): Site => ({ ...input, projectId: input.spaceId });

export const seedSites: Site[] = [
  site({ id:'telegram', title:'Telegram', subtitle:'Мессенджер', url:'https://web.telegram.org', iconUrl:faviconUrlFor('https://web.telegram.org'), domain:'web.telegram.org', spaceId:'home', categoryId:'communication', favorite:true, position:0 }),
  site({ id:'rbk', title:'РБК', subtitle:'Новости', url:'https://www.rbc.ru', iconUrl:faviconUrlFor('https://www.rbc.ru'), domain:'rbc.ru', spaceId:'home', categoryId:'news', favorite:false, position:1 }),
  site({ id:'vc', title:'VC.ru', subtitle:'Сообщество', url:'https://vc.ru', iconUrl:faviconUrlFor('https://vc.ru'), domain:'vc.ru', spaceId:'home', categoryId:'social', favorite:false, position:2 }),
  site({ id:'youtube', title:'YouTube', subtitle:'Видео', url:'https://youtube.com', iconUrl:faviconUrlFor('https://youtube.com'), domain:'youtube.com', spaceId:'home', categoryId:'entertainment', favorite:true, position:3 }),
  site({ id:'photos', title:'Google Фото', subtitle:'Галерея', url:'https://photos.google.com', iconUrl:faviconUrlFor('https://photos.google.com'), domain:'photos.google.com', spaceId:'home', categoryId:'services', favorite:false, position:4 }),
  site({ id:'drive', title:'Google Диск', subtitle:'Файлы', url:'https://drive.google.com', iconUrl:faviconUrlFor('https://drive.google.com'), domain:'drive.google.com', spaceId:'work', categoryId:'services', favorite:true, position:5 }),
  site({ id:'calendar', title:'Google Календарь', subtitle:'Календарь', url:'https://calendar.google.com', iconUrl:faviconUrlFor('https://calendar.google.com'), domain:'calendar.google.com', spaceId:'work', categoryId:'productivity', favorite:true, position:6 }),
  site({ id:'gmail', title:'Gmail', subtitle:'Почта', url:'https://mail.google.com', iconUrl:faviconUrlFor('https://mail.google.com'), domain:'mail.google.com', spaceId:'work', categoryId:'communication', favorite:true, position:7 }),
  site({ id:'todoist', title:'Todoist', subtitle:'Задачи', url:'https://todoist.com', iconUrl:faviconUrlFor('https://todoist.com'), domain:'todoist.com', spaceId:'work', categoryId:'productivity', favorite:false, position:8 }),
  site({ id:'dropbox', title:'Dropbox', subtitle:'Облако', url:'https://dropbox.com', iconUrl:faviconUrlFor('https://dropbox.com'), domain:'dropbox.com', spaceId:'work', categoryId:'services', favorite:false, position:9 }),
  site({ id:'ozon', title:'Ozon', subtitle:'Покупки', url:'https://ozon.ru', iconUrl:faviconUrlFor('https://ozon.ru'), domain:'ozon.ru', spaceId:'home', categoryId:'shopping', favorite:false, position:10 }),
  site({ id:'sber', title:'Сбербанк', subtitle:'Финансы', url:'https://online.sberbank.ru', iconUrl:faviconUrlFor('https://online.sberbank.ru'), domain:'online.sberbank.ru', spaceId:'home', categoryId:'finance', favorite:false, position:11 }),
  site({ id:'metrika', title:'Яндекс Метрика', subtitle:'Аналитика', url:'https://metrika.yandex.ru', iconUrl:faviconUrlFor('https://metrika.yandex.ru'), domain:'metrika.yandex.ru', spaceId:'work', categoryId:'tools', favorite:false, position:12 }),
  site({ id:'github', title:'GitHub', subtitle:'Разработка', url:'https://github.com', iconUrl:faviconUrlFor('https://github.com'), domain:'github.com', spaceId:'work', categoryId:'development', favorite:true, position:13 }),
  site({ id:'kaspersky', title:'Kaspersky', subtitle:'Безопасность', url:'https://www.kaspersky.ru', iconUrl:faviconUrlFor('https://www.kaspersky.ru'), domain:'kaspersky.ru', spaceId:'home', categoryId:'tools', favorite:false, position:14 }),
];
