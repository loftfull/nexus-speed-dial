import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel, type SettingsProps } from './SettingsPanel';
import type { AppearanceState, TileState, UiState } from '../domain/appStore';

const ui: UiState = {
  sidebar: true, weather: true, compact: false, animations: true, newTab: true,
  searchLocal: true, searchSuggestions: true, searchEngine: 'Google',
  weatherCity: 'Москва', weatherUnits: 'Цельсий (°C)', weatherAuto: true,
  localOnly: true, saveHistory: true, analytics: false,
};
const tile: TileState = { mode: 'standard', preset: 'glass', radius: 20, iconSize: 40, hover: 'lift', shadow: 'soft', font: 'Manrope', size: 'M' };
const appearance: AppearanceState = { theme: 'light', accent: '#2f6fe4', wallpaper: 'aurora' };

function setup(overrides: Partial<SettingsProps> = {}) {
  const props: SettingsProps = {
    onClose: vi.fn(),
    sites: [], setSites: vi.fn(), categories: [], setCategories: vi.fn(),
    groups: [], setGroups: vi.fn(), projects: [], setProjects: vi.fn(),
    sessions: [], setSessions: vi.fn(),
    density: 20, setDensity: vi.fn(),
    ui, setUi: vi.fn(), tile, setTile: vi.fn(), appearance, setAppearance: vi.fn(),
    ...overrides,
  };
  render(<SettingsPanel {...props} />);
  return props;
}

describe('SettingsPanel', () => {
  it('открывается на разделе оформления', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Тема' })).toBeInTheDocument();
  });

  it('переключает тему', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: /Тёмная/ }));
    expect(props.setAppearance).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('меняет размер плитки в разделе плиток', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    await user.click(screen.getByRole('button', { name: 'Крупно' }));
    const update = (props.setTile as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: TileState) => TileState;
    expect(update(tile).size).toBe('L');
  });

  it('выключает значки уведомлений', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    const toggle = screen.getByRole('switch', { name: 'Значки уведомлений' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    const update = (props.setTile as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: TileState) => TileState;
    expect(update(tile).showNotifications).toBe(false);
  });

  it('меняет поисковую систему', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Поиск' }));
    await user.selectOptions(screen.getByLabelText('Поисковая система'), 'Яндекс');
    const update = (props.setUi as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: UiState) => UiState;
    expect(update(ui).searchEngine).toBe('Яндекс');
  });

  it('закрывается по Escape', async () => {
    const user = userEvent.setup();
    const props = setup();
    screen.getByRole('button', { name: 'Оформление' }).focus();
    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalled();
  });
});
