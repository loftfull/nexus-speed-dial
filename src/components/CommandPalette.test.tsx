import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BrowserSession, SiteRecord } from '../domain/types';
import { CommandPalette } from './CommandPalette';

const defaultProps = () => ({
  sites: [] as SiteRecord[],
  categories: [] as { id: string; name: string }[],
  history: [] as string[],
  sessions: [] as BrowserSession[],
  onOpenSession: vi.fn(),
  onOpenSite: vi.fn(),
  onOpenHistory: vi.fn(),
  onCategory: vi.fn(),
  onClose: vi.fn(),
  onAddSite: vi.fn(),
  onSettings: vi.fn(),
  onFavorites: vi.fn(),
  onNotes: vi.fn(),
});

const githubSite: SiteRecord = {
  id: 'site-github',
  title: 'GitHub',
  desc: 'Код',
  domain: 'github.com',
  color: '#000',
  icon: 'GH',
  category: 'Работа',
};

afterEach(() => vi.restoreAllMocks());

describe('CommandPalette', () => {
  it.each([
    ['Добавить сайт', 'onAddSite'],
    ['Открыть избранное', 'onFavorites'],
    ['Открыть заметки', 'onNotes'],
    ['Открыть настройки', 'onSettings'],
  ] as const)('runs the real quick action %s and closes the palette', async (label, callbackName) => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<CommandPalette {...props} />);

    await user.click(screen.getByRole('button', { name: new RegExp(label) }));

    expect(props[callbackName]).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('routes category search results through the category callback', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.categories = [{ id: 'cat-work', name: 'Работа' }];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'Работа');
    await user.click(screen.getByRole('button', { name: /Работа/ }));

    expect(props.onCategory).toHaveBeenCalledWith('cat-work');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('opens a saved session from search results through the application callback', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    const session: BrowserSession = {
      id: 'session-1',
      name: 'Утренний обзор',
      siteIds: ['site-github'],
      createdAt: 1,
    };
    props.sessions = [session];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'Утренний');
    await user.click(screen.getByRole('button', { name: /Утренний обзор/ }));

    expect(props.onOpenSession).toHaveBeenCalledWith(session);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('routes a matching saved site through the application open callback', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.sites = [githubSite];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'GitHub');
    await user.click(screen.getByRole('button', { name: /GitHub/ }));

    expect(props.onOpenSite).toHaveBeenCalledWith(githubSite);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('routes saved-site history through the history application callback', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.sites = [githubSite];
    props.history = ['site-github'];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'GitHub');
    const historyResult = screen.getByRole('button', { name: /Недавно открытый ресурс/ });
    await user.click(historyResult);

    expect(props.onOpenHistory).toHaveBeenCalledWith('site-github');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('routes legacy history URLs unchanged through the application callback', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    props.history = ['http://example.com/archive'];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'example');
    await user.click(screen.getByRole('button', { name: /http:\/\/example.com\/archive/ }));

    expect(props.onOpenHistory).toHaveBeenCalledWith('http://example.com/archive');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('runs the selected result with Enter', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<CommandPalette {...props} />);

    await user.keyboard('{Enter}');

    expect(props.onAddSite).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
