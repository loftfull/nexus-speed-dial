import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryWorkspace } from './LibraryWorkspace';
import type { SiteRecord } from '../domain/types';

const sites: SiteRecord[] = [
  { title: 'Figma', domain: 'figma.com', desc: 'Design', color: '#3988ee', icon: 'F', category: 'Работа', tags: ['дизайн'], note: 'План запуска макета' },
  { title: 'GitHub', domain: 'github.com', desc: 'Code', color: '#24292f', icon: 'G', category: 'Работа', tags: ['код'] },
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
});
