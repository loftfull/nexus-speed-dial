import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';
import type { PaletteItem } from '../domain/palette';

const items: PaletteItem[] = [
  { id: 'site:s-figma', kind: 'site', ref: 's-figma', title: 'Figma', hint: 'figma.com · Работа → Дизайн', keywords: 'figma.com макеты', domain: 'figma.com' },
  { id: 'site:s-habr', kind: 'site', ref: 's-habr', title: 'Хабр', hint: 'habr.com · Дом → Чтение', keywords: 'habr.com статьи', domain: 'habr.com' },
  { id: 'command:add-site', kind: 'command', ref: 'add-site', title: 'Добавить сайт', hint: 'Новая закладка', keywords: 'создать', shortcut: 'Ctrl N' },
  { id: 'section:trash', kind: 'section', ref: 'trash', title: 'Корзина', hint: 'Раздел', keywords: 'раздел' },
];

const tail = (query: string): PaletteItem[] => ([
  { id: 'web:search', kind: 'web', ref: 'search', title: `Искать «${query}»`, hint: 'Поиск в Google', keywords: '' },
]);

const setup = (props: Partial<Parameters<typeof CommandPalette>[0]> = {}) => {
  const onRun = vi.fn();
  const onClose = vi.fn();
  render(<CommandPalette items={items} tail={tail} onRun={onRun} onClose={onClose} {...props} />);
  return { onRun, onClose, input: screen.getByRole('combobox') };
};

const options = () => screen.getAllByRole('option').map(node => node.textContent ?? '');
const selected = () => screen.getAllByRole('option').find(node => node.getAttribute('aria-selected') === 'true');

describe('CommandPalette', () => {
  it('открывается с фокусом в поле и показывает всё до ввода', () => {
    const { input } = setup();
    expect(input).toHaveFocus();
    expect(options()).toHaveLength(items.length);
  });

  it('находит сайт из другого проекта по названию, домену и описанию', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.type(input, 'хабр');
    expect(options()[0]).toContain('Хабр');
    await user.clear(input);
    await user.type(input, 'макеты');
    expect(options()[0]).toContain('Figma');
  });

  it('ведёт выбор стрелками по кругу и открывает по Enter', async () => {
    const user = userEvent.setup();
    const { input, onRun } = setup();
    expect(selected()?.textContent).toContain('Figma');
    await user.keyboard('{ArrowDown}');
    expect(selected()?.textContent).toContain('Хабр');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(selected()?.textContent).toContain('Корзина');
    await user.keyboard('{Home}');
    expect(selected()?.textContent).toContain('Figma');
    await user.keyboard('{End}');
    expect(selected()?.textContent).toContain('Корзина');
    await user.keyboard('{Enter}');
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ref: 'trash' }), '');
    expect(input).toHaveFocus();
  });

  it('добавляет веб-действие под результатами, когда что-то набрано', async () => {
    const user = userEvent.setup();
    const { input, onRun } = setup();
    await user.type(input, 'хабр');
    const last = options()[options().length - 1];
    expect(last).toContain('Искать «хабр»');
    await user.keyboard('{End}{Enter}');
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ kind: 'web' }), 'хабр');
  });

  it('показывает горячую клавишу рядом с командой', () => {
    setup();
    expect(screen.getByText('Ctrl N')).toBeTruthy();
  });

  it('подсвечивает совпавшие буквы названия', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.type(input, 'фиг');
    expect(screen.queryAllByText('Ничего не найдено')).toHaveLength(0);
    await user.clear(input);
    await user.type(input, 'хаб');
    const marks = document.querySelectorAll('.nx-palette-hit');
    expect(marks.length).toBeGreaterThan(0);
    expect([...marks].map(mark => mark.textContent).join('')).toBe('Хаб');
  });

  it('закрывается по Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('без подсказок из закладок до ввода показывает только вызываемое', () => {
    setup({ suggestions: false });
    expect(options().some(text => text.includes('Figma'))).toBe(false);
    expect(options().some(text => text.includes('Добавить сайт'))).toBe(true);
  });

  it('открывается с уже набранным фильтром сетки', () => {
    const { input } = setup({ initialQuery: 'хабр' });
    expect((input as HTMLInputElement).value).toBe('хабр');
    expect(options()[0]).toContain('Хабр');
  });

  it('сообщает, когда не нашлось ничего, кроме веб-действия', async () => {
    const user = userEvent.setup();
    setup({ tail: undefined });
    await user.type(screen.getByRole('combobox'), 'щщщ');
    expect(screen.getByText('Ничего не найдено')).toBeTruthy();
  });
});
