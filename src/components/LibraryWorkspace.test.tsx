import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryWorkspace } from './LibraryWorkspace';
import type { Project, SiteRecord } from '../domain/types';

const sites: SiteRecord[] = [
  { id: 'figma', title: 'Figma', domain: 'figma.com', desc: 'Design', color: '#3988ee', icon: 'F', category: 'Работа', tags: ['дизайн'], note: 'План запуска макета' },
  { id: 'github', title: 'GitHub', domain: 'github.com', desc: 'Code', color: '#24292f', icon: 'G', category: 'Работа', tags: ['код'] },
];

describe('LibraryWorkspace', () => {
  const renderLibrary = (initialTag?: string) => render(<LibraryWorkspace
    sites={sites}
    initialTag={initialTag}
    projects={[]}
    onOpen={vi.fn()}
    onToggleFavorite={vi.fn()}
    onChange={vi.fn()}
    onChangeProjects={vi.fn()}
  />);

  it('opens with the tag passed from Tags workspace', () => {
    renderLibrary('дизайн');
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it('searches notes in addition to title, domain and tags', async () => {
    const user = userEvent.setup();
    renderLibrary();
    await user.type(screen.getByLabelText('Поиск в библиотеке'), 'план запуска');
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it('keeps duplicate-domain records independent by site id', async () => {
    const user = userEvent.setup();
    const duplicateSites: SiteRecord[] = [
      { id: 'docs', title: 'GitHub Docs', domain: 'github.com', desc: 'Docs', color: '#111', icon: 'D', category: 'Работа' },
      { id: 'issues', title: 'GitHub Issues', domain: 'github.com', desc: 'Issues', color: '#222', icon: 'I', category: 'Работа' },
    ];
    const projects: Project[] = [{ id: 'work', name: 'Work', color: '#111', icon: 'W', siteIds: [], createdAt: 1, updatedAt: 1 }];
    const onToggleFavorite = vi.fn();
    const onChangeProjects = vi.fn();

    render(<LibraryWorkspace
      sites={duplicateSites}
      projects={projects}
      onOpen={vi.fn()}
      onToggleFavorite={onToggleFavorite}
      onChange={vi.fn()}
      onChangeProjects={onChangeProjects}
    />);

    await user.click(screen.getByLabelText('Выбрать GitHub Docs'));
    await user.selectOptions(screen.getByLabelText('Проект для выбранных материалов'), 'work');
    await user.click(screen.getByRole('button', { name: /В проект/ }));

    expect(onChangeProjects).toHaveBeenCalledTimes(1);
    const updater = onChangeProjects.mock.calls[0][0] as (current: Project[]) => Project[];
    expect(updater(projects)[0].siteIds).toEqual(['docs']);

    const docsCard = screen.getByText('GitHub Docs').closest('article');
    expect(docsCard).not.toBeNull();
    await user.click(within(docsCard!).getByLabelText('Добавить в избранное'));
    expect(onToggleFavorite).toHaveBeenCalledWith('docs');
  });
});
