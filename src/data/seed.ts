import type { Category, Project, Site } from '../domain/types.ts';
import { faviconUrlFor } from '../domain/siteIcon.ts';

export const seedProjects: Project[] = [
  { id: 'home', name: 'Дом', icon: 'home' },
  { id: 'work', name: 'Работа', icon: 'briefcase' },
  { id: 'project', name: 'Проект', icon: 'folder-kanban' },
];

export const seedCategories: Category[] = [
  { id: 'social', name: 'Социальные сети', projectId: 'home', icon: 'users' },
  { id: 'communication', name: 'Общение', projectId: 'home', parentId: 'social', icon: 'message-circle' },
  { id: 'news', name: 'Новости', projectId: 'home', parentId: 'social', icon: 'newspaper' },
  { id: 'services', name: 'Сервисы', projectId: 'home', icon: 'grid-2x2' },
  { id: 'productivity', name: 'Продуктивность', projectId: 'home', icon: 'check-square' },
  { id: 'entertainment', name: 'Развлечения', projectId: 'home', icon: 'play-circle' },
  { id: 'tools', name: 'Инструменты', projectId: 'home', icon: 'wrench' },
  { id: 'shopping', name: 'Покупки', projectId: 'home', icon: 'shopping-cart' },
  { id: 'finance', name: 'Финансы', projectId: 'home', icon: 'badge-dollar-sign' },
  { id: 'development', name: 'Разработка', projectId: 'work', icon: 'github' },
];

export const seedSites: Site[] = [
  { id:'telegram', title:'Telegram', subtitle:'Мессенджер', url:'https://web.telegram.org', iconUrl:faviconUrlFor('https://web.telegram.org'), domain:'web.telegram.org', projectId:'home', categoryId:'communication', favorite:true },
  { id:'rbk', title:'РБК', subtitle:'Новости', url:'https://www.rbc.ru', iconUrl:faviconUrlFor('https://www.rbc.ru'), domain:'rbc.ru', projectId:'home', categoryId:'news', favorite:false },
  { id:'vc', title:'VC.ru', subtitle:'Сообщество', url:'https://vc.ru', iconUrl:faviconUrlFor('https://vc.ru'), domain:'vc.ru', projectId:'home', categoryId:'social', favorite:false },
  { id:'youtube', title:'YouTube', subtitle:'Видео', url:'https://youtube.com', iconUrl:faviconUrlFor('https://youtube.com'), domain:'youtube.com', projectId:'home', categoryId:'entertainment', favorite:true },
  { id:'photos', title:'Google Фото', subtitle:'Галерея', url:'https://photos.google.com', iconUrl:faviconUrlFor('https://photos.google.com'), domain:'photos.google.com', projectId:'home', categoryId:'services', favorite:false },
  { id:'drive', title:'Google Диск', subtitle:'Файлы', url:'https://drive.google.com', iconUrl:faviconUrlFor('https://drive.google.com'), domain:'drive.google.com', projectId:'work', categoryId:'services', favorite:true },
  { id:'calendar', title:'Google Календарь', subtitle:'Календарь', url:'https://calendar.google.com', iconUrl:faviconUrlFor('https://calendar.google.com'), domain:'calendar.google.com', projectId:'work', categoryId:'productivity', favorite:true },
  { id:'gmail', title:'Gmail', subtitle:'Почта', url:'https://mail.google.com', iconUrl:faviconUrlFor('https://mail.google.com'), domain:'mail.google.com', projectId:'work', categoryId:'communication', favorite:true },
  { id:'todoist', title:'Todoist', subtitle:'Задачи', url:'https://todoist.com', iconUrl:faviconUrlFor('https://todoist.com'), domain:'todoist.com', projectId:'work', categoryId:'productivity', favorite:false },
  { id:'dropbox', title:'Dropbox', subtitle:'Облако', url:'https://dropbox.com', iconUrl:faviconUrlFor('https://dropbox.com'), domain:'dropbox.com', projectId:'work', categoryId:'services', favorite:false },
  { id:'ozon', title:'Ozon', subtitle:'Покупки', url:'https://ozon.ru', iconUrl:faviconUrlFor('https://ozon.ru'), domain:'ozon.ru', projectId:'home', categoryId:'shopping', favorite:false },
  { id:'sber', title:'Сбербанк', subtitle:'Финансы', url:'https://online.sberbank.ru', iconUrl:faviconUrlFor('https://online.sberbank.ru'), domain:'online.sberbank.ru', projectId:'home', categoryId:'finance', favorite:false },
  { id:'metrika', title:'Яндекс Метрика', subtitle:'Аналитика', url:'https://metrika.yandex.ru', iconUrl:faviconUrlFor('https://metrika.yandex.ru'), domain:'metrika.yandex.ru', projectId:'work', categoryId:'tools', favorite:false },
  { id:'github', title:'GitHub', subtitle:'Разработка', url:'https://github.com', iconUrl:faviconUrlFor('https://github.com'), domain:'github.com', projectId:'work', categoryId:'development', favorite:true },
  { id:'kaspersky', title:'Kaspersky', subtitle:'Безопасность', url:'https://www.kaspersky.ru', iconUrl:faviconUrlFor('https://www.kaspersky.ru'), domain:'kaspersky.ru', projectId:'home', categoryId:'tools', favorite:false },
];
