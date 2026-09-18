import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tile, monogram } from './Tile';
import type { SiteRecord } from '../domain/types';

const site: SiteRecord = {
  id: 'site-figma', title: 'Figma', desc: 'Дизайн', domain: 'figma.com',
  color: '#f24e35', icon: 'F', category: 'Инструменты', categoryId: 'cat-tools',
};

const handlers = () => ({ onOpen: vi.fn(), onFavorite: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() });

describe('monogram', () => {
  it('берёт первую букву односложного названия', () => {
    expect(monogram('YouTube')).toBe('Y');
    expect(monogram('Почта')).toBe('П');
  });

  it('склеивает инициалы из двух слов', () => {
    expect(monogram('Google Drive')).toBe('GD');
    expect(monogram('Т-Банк')).toBe('ТБ');
  });

  it('не падает на пустом названии', () => {
    expect(monogram('   ')).toBe('?');
  });
});

describe('Tile', () => {
  it('открывает сайт по нажатию на плитку', async () => {
    const user = userEvent.setup();
    const props = handlers();
    render(<Tile site={site} useFavicons={false} {...props} />);
    await user.click(screen.getByRole('button', { name: 'Открыть «Figma»' }));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it('прячет действия за меню и вызывает их', async () => {
    const user = userEvent.setup();
    const props = handlers();
    render(<Tile site={site} useFavicons={false} {...props} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Действия для «Figma»/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /В избранное/ }));
    expect(props.onFavorite).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('закрывает меню по Escape и возвращает фокус на кнопку', async () => {
    const user = userEvent.setup();
    render(<Tile site={site} useFavicons={false} {...handlers()} />);
    const toggle = screen.getByRole('button', { name: /Действия для «Figma»/ });
    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('предлагает убрать из избранного, когда сайт уже отмечен', async () => {
    const user = userEvent.setup();
    render(<Tile site={{ ...site, favorite: true }} useFavicons={false} {...handlers()} />);
    await user.click(screen.getByRole('button', { name: /Действия для «Figma»/ }));
    expect(screen.getByRole('menuitem', { name: /Убрать из избранного/ })).toBeInTheDocument();
  });

  it('держит монограмму на экране, пока иконка сайта не загрузилась', () => {
    const { container } = render(<Tile site={site} useFavicons {...handlers()} />);
    const image = container.querySelector('img') as HTMLImageElement;
    // Сначала пробуется крупная иконка сайта, а не 16-пиксельный favicon.ico.
    expect(image.src).toBe('https://figma.com/apple-touch-icon.png');
    // Незагруженная картинка не помечена ready и потому прозрачна, но остаётся
    // в разметке: скрытая через display:none она бы не загрузилась вовсе.
    expect(image.className).not.toContain('ready');
    expect(image.hidden).toBe(false);
    expect(container.querySelector('.nx-mark')).toHaveTextContent('F');
  });

  it('переходит к следующему адресу, когда иконка не загрузилась', async () => {
    const { container } = render(<Tile site={site} useFavicons {...handlers()} />);
    const image = () => container.querySelector('img') as HTMLImageElement;
    expect(image().src).toBe('https://figma.com/apple-touch-icon.png');
    await act(async () => { fireEvent.error(image()); });
    expect(image().src).toBe('https://figma.com/apple-touch-icon-precomposed.png');
    // Монограмма никуда не делась и продолжает держать плитку.
    expect(container.querySelector('.nx-mark')).toHaveTextContent('F');
  });

  it('не запрашивает иконку сайта, когда логотипы выключены', () => {
    const { container } = render(<Tile site={site} useFavicons={false} {...handlers()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.nx-mark')).toHaveTextContent('F');
  });
});

describe('Tile layouts', () => {
  it('в табличном виде показывает краткое описание и не показывает адрес', () => {
    const { container } = render(<Tile site={site} layout="table" {...handlers()} />);
    expect(screen.getByText('Дизайн')).toBeInTheDocument();
    expect(container.querySelector('.nx-tile-sub')).toBeNull();
    expect(container.querySelector('.nx-tile-table')).not.toBeNull();
  });

  it('в строчном виде показывает и описание, и адрес', () => {
    const { container } = render(<Tile site={site} layout="row" {...handlers()} />);
    expect(screen.getByText('Дизайн')).toBeInTheDocument();
    expect(screen.getByText('figma.com')).toBeInTheDocument();
    // Иконка стоит рядом с текстом, а не над ним.
    expect(container.querySelector('.nx-tile-text')).not.toBeNull();
  });

  it('в виде иконок оставляет только название', () => {
    const { container } = render(<Tile site={site} layout="icon" {...handlers()} />);
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(container.querySelector('.nx-tile-desc')).toBeNull();
    expect(container.querySelector('.nx-tile-sub')).toBeNull();
  });

  it('в стандартном виде описание появляется только по настройке', () => {
    const { container, rerender } = render(<Tile site={site} layout="standard" {...handlers()} />);
    expect(container.querySelector('.nx-tile-desc')).toBeNull();
    rerender(<Tile site={site} layout="standard" showDescription {...handlers()} />);
    expect(screen.getByText('Дизайн')).toBeInTheDocument();
  });
});
