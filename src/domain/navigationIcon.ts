export type NavigationIconKey = 'home' | 'work' | 'project' | 'social' | 'finance' | 'shopping' | 'tools' | 'services' | 'entertainment' | 'tag';

export function navigationIconKey(label: string, id = ''): NavigationIconKey {
  const value = `${id} ${label}`.toLocaleLowerCase('ru-RU');
  if (/(^|\s)(home|дом)(\s|$)/.test(value)) return 'home';
  if (/(work|работ)/.test(value)) return 'work';
  if (/(project|проект)/.test(value)) return 'project';
  if (/(social|соц|общен|чат|messeng)/.test(value)) return 'social';
  if (/(financ|финанс|банк|money)/.test(value)) return 'finance';
  if (/(shop|покуп|магаз|market)/.test(value)) return 'shopping';
  if (/(tool|инструмент|утилит)/.test(value)) return 'tools';
  if (/(service|сервис|продуктив|productiv)/.test(value)) return 'services';
  if (/(entertain|развлеч|видео|video|music|музык)/.test(value)) return 'entertainment';
  return 'tag';
}
