import { render, screen } from '@testing-library/react';
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
    expect(image.src).toBe('https://figma.com/favicon.ico');
    // Иначе WebKit рисует значок битой картинки поверх плитки.
    expect(image.hidden).toBe(true);
    expect(container.querySelector('.nx-mark')).toHaveTextContent('F');
  });
});
