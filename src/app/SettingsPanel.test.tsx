import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel, type SettingsProps } from './SettingsPanel';
import type { AppearanceState, TileState, UiState } from '../domain/appStore';
import { DEFAULT_TILE_APPEARANCE } from '../domain/tileAppearance';

const ui: UiState = {
  sidebar: true, weather: true, compact: false, animations: true, newTab: true,
  searchLocal: true, searchSuggestions: true, searchEngine: 'Google',
  weatherCity: 'Москва', weatherUnits: 'Цельсий (°C)', weatherAuto: true,
  localOnly: true, saveHistory: true, analytics: false,
};
const tile: TileState = { ...DEFAULT_TILE_APPEARANCE };
const appearance: AppearanceState = { theme: 'light', accent: '#2f6fe4', wallpaper: 'aurora' };

function setup(overrides: Partial<SettingsProps> = {}) {
  const props: SettingsProps = {
    onClose: vi.fn(),
    sites: [], setSites: vi.fn(), categories: [], setCategories: vi.fn(),
    groups: [], setGroups: vi.fn(), projects: [], setProjects: vi.fn(),
    sessions: [], setSessions: vi.fn(),
    ui, setUi: vi.fn(), tile, setTile: vi.fn(), appearance, setAppearance: vi.fn(),
    ...overrides,
  };
  render(<SettingsPanel {...props} />);
  return props;
}

describe('SettingsPanel', () => {
  it('открывается на разделе оформления', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Оформление окна' })).toBeInTheDocument();
  });

  it('переключает тему', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.selectOptions(screen.getByLabelText('Тема'), 'dark');
    expect(props.setAppearance).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('применяет готовый вид целиком', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    await user.click(screen.getByRole('button', { name: 'Готовый вид «Тёмный»' }));
    expect(props.setTile).toHaveBeenCalledWith(expect.objectContaining({ preset: 'contrast', surface: 'contrast' }));
  });

  it('включает категорию на плитке', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    const toggle = screen.getByRole('switch', { name: 'Категория' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    const update = (props.setTile as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: TileState) => TileState;
    expect(update(tile).showCategory).toBe(true);
  });

  it('предлагает ровно девять готовых видов', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    expect(screen.getAllByRole('button', { name: /^Готовый вид «/ })).toHaveLength(9);
  });

  it('гасит контрол, который при текущих значениях ничего не изменит', async () => {
    const user = userEvent.setup();
    setup({ tile: { ...DEFAULT_TILE_APPEARANCE, shadowStyle: 'none', borderWidth: 0 } });
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    // Тень выключена — её числовые параметры и усиление под курсором погашены.
    expect(screen.getByLabelText('Глубина тени')).toBeDisabled();
    expect(screen.getByLabelText('Мягкость тени')).toBeDisabled();
    expect(screen.getByLabelText('Плотность тени')).toBeDisabled();
    expect(screen.getByLabelText('Тень под курсором')).toBeDisabled();
    expect(screen.getAllByText('Тень выключена')).toHaveLength(4);
    // Рамки нет — её плотность тоже ни на что не влияет.
    expect(screen.getByLabelText('Плотность рамки')).toBeDisabled();
    expect(screen.getByText('Сначала задайте толщину рамки')).toBeInTheDocument();
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

  it('uses an in-app destructive dialog before clearing workspace data', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: 'Данные' }));
    await user.click(screen.getByRole('button', { name: 'Очистить рабочие данные' }));

    const dialog = screen.getByRole('dialog', { name: 'Очистить рабочие данные?' });
    expect(dialog).toBeInTheDocument();
    expect(props.setSites).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Очистить данные' }));
    expect(props.setSites).toHaveBeenCalledWith([]);
    expect(props.setProjects).toHaveBeenCalledWith([]);
    expect(props.setSessions).toHaveBeenCalledWith([]);
  });


  it('describes the external weather request without claiming zero disclosure', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Погода' }));
    expect(screen.queryByText(/без передачи ваших данных/i)).not.toBeInTheDocument();
    expect(screen.getByText(/запрос отправляется.*Open-Meteo/i)).toBeInTheDocument();
  });


  it('показывает все разделы прежней панели настроек', () => {
    setup();
    for (const label of ['Общие', 'Оформление', 'Плитки', 'Боковое окно', 'Мобильная версия',
      'Поиск', 'Погода', 'Приватность', 'Горячие клавиши', 'Данные']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('включает компактный интерфейс в разделе «Общие»', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Общие' }));
    await user.click(screen.getByRole('switch', { name: 'Компактный интерфейс' }));
    const update = (props.setUi as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: UiState) => UiState;
    expect(update(ui).compact).toBe(true);
  });

  it('меняет режим отображения плитки', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Плитки' }));
    await user.selectOptions(screen.getByLabelText('Раскладка'), 'list');
    const update = (props.setTile as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: TileState) => TileState;
    expect(update(tile).mode).toBe('list');
  });

  it('меняет ширину бокового окна', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Боковое окно' }));
    await user.selectOptions(screen.getByLabelText('Ширина окна'), '340px');
    const update = (props.setUi as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: UiState) => UiState;
    expect(update(ui).sidebarWidth).toBe('340px');
  });

  it('выбирает вид по умолчанию для мобильной версии', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole('button', { name: 'Мобильная версия' }));
    await user.click(screen.getByRole('button', { name: /^Иконки/ }));
    const update = (props.setUi as ReturnType<typeof vi.fn>).mock.calls[0][0] as (current: UiState) => UiState;
    expect(update(ui).mobileMode).toBe('icons');
  });

  it('перечисляет реальные горячие клавиши', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Горячие клавиши' }));
    expect(screen.getByText('Ctrl + N')).toBeInTheDocument();
    expect(screen.getByText('Добавить сайт')).toBeInTheDocument();
  });

  it('сбрасывает раздел к значениям по умолчанию', async () => {
    const user = userEvent.setup();
    const props = setup({ appearance: { theme: 'dark', accent: '#c9364f', wallpaper: 'mint' } });
    await user.click(screen.getByRole('button', { name: /Сбросить раздел «Оформление»/ }));
    expect(props.setAppearance).toHaveBeenCalledWith({ theme: 'light', accent: '#2f6fe4', wallpaper: 'aurora' });
  });

  it('не предлагает сброс в разделах без настроек', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Данные' }));
    expect(screen.queryByRole('button', { name: /Сбросить раздел «Данные»/ })).not.toBeInTheDocument();
  });
});
