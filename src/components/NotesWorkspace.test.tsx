import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotesWorkspace } from './NotesWorkspace';
import type { SiteRecord } from '../domain/types';

const site = (title: string, note: string): SiteRecord => ({
  id: `site-${title}`, title, domain: `${title.toLowerCase()}.test`,
  url: `https://${title.toLowerCase()}.test`, desc: '', color: '#2f6fe4',
  icon: title[0], category: 'Работа', note,
});

describe('NotesWorkspace', () => {
  it('показывает заметку каждого сайта', () => {
    render(<NotesWorkspace sites={[site('Figma', 'Макеты лежат в общем проекте')]} onEdit={vi.fn()} />);
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.getByText('figma.test')).toBeInTheDocument();
    expect(screen.getByText('Макеты лежат в общем проекте')).toBeInTheDocument();
  });

  it('ведёт в редактирование именно того сайта, чью заметку нажали', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const second = site('Linear', 'Спринт закрываем по пятницам');
    render(<NotesWorkspace sites={[site('Figma', 'Первая'), second]} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: 'Редактировать заметку «Linear»' }));
    expect(onEdit).toHaveBeenCalledWith(second);
  });

  /**
   * Раздел был написан на классах без единого правила в стилях, поэтому
   * браузер рисовал его умолчаниями. Проверка держит имена в пространстве
   * `nx-`, где их видит и `scripts/check-classes.mjs`.
   */
  it('держит разметку в пространстве имён оформления', () => {
    const { container } = render(
      <NotesWorkspace sites={[site('Figma', 'Заметка')]} onEdit={vi.fn()} />,
    );
    const classes = [...container.querySelectorAll('*')]
      .flatMap(node => [...node.classList])
      .filter(name => !name.startsWith('nx-'));
    expect(classes, `классы вне пространства nx-: ${classes.join(', ')}`).toEqual([]);
  });
});
