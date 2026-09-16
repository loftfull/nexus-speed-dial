import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BrowserSession, SiteRecord } from '../domain/types';
import { CommandPalette } from './CommandPalette';

const defaultProps = () => ({
  sites: [] as SiteRecord[],
  categories: [] as string[],
  history: [] as string[],
  sessions: [] as BrowserSession[],
  onOpenSession: vi.fn(),
  onCategory: vi.fn(),
  onClose: vi.fn(),
  onAddSite: vi.fn(),
  onSettings: vi.fn(),
  onFavorites: vi.fn(),
  onNotes: vi.fn(),
});

const githubSite: SiteRecord = {
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
    props.categories = ['Работа'];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'Работа');
    await user.click(screen.getByRole('button', { name: /Работа/ }));

    expect(props.onCategory).toHaveBeenCalledWith('Работа');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('opens a saved session from search results', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    const session: BrowserSession = {
      id: 'session-1',
      name: 'Утренний обзор',
      siteIds: ['GitHub'],
      createdAt: 1,
    };
    props.sessions = [session];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'Утренний');
    await user.click(screen.getByRole('button', { name: /Утренний обзор/ }));

    expect(props.onOpenSession).toHaveBeenCalledWith(session);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('opens a matching site in a new protected tab', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const props = defaultProps();
    props.sites = [githubSite];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'GitHub');
    await user.click(screen.getByRole('button', { name: /GitHub/ }));

    expect(open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('resolves current history titles back to their saved site domain', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const props = defaultProps();
    props.sites = [githubSite];
    props.history = ['GitHub'];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'GitHub');
    const historyResult = screen.getByRole('button', { name: /Недавно открытый ресурс/ });
    await user.click(historyResult);

    expect(open).toHaveBeenCalledWith('https://github.com', '_blank', 'noopener,noreferrer');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('keeps legacy history URLs without corrupting their protocol', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const props = defaultProps();
    props.history = ['http://example.com/archive'];
    render(<CommandPalette {...props} />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'example');
    await user.click(screen.getByRole('button', { name: /http:\/\/example.com\/archive/ }));

    expect(open).toHaveBeenCalledWith('http://example.com/archive', '_blank', 'noopener,noreferrer');
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
