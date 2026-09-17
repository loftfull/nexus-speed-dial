import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Settings } from './SettingsPanel';
import { createBackup } from '../domain/backup';
import type { SiteRecord } from '../domain/types';

const baseProps = () => ({
  onClose: vi.fn(), density: 20, setDensity: vi.fn(), sites: [], setSites: vi.fn(),
  ui: { sidebar: true, weather: true, compact: false, animations: true, newTab: true },
  setUi: vi.fn(), tile: { mode: 'standard' as const, preset: 'glass' as const, radius: 20, iconSize: 40, hover: 'lift', shadow: 'soft', font: 'Manrope' }, setTile: vi.fn(),
  appearance: { theme: 'light', accent: '#2f7cf6', wallpaper: 'aurora' }, setAppearance: vi.fn(),
});

describe('SettingsPanel', () => {
  it('switches sections and sends tile changes to the store', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Плитки сайтов/ }));
    expect(screen.getByText('Режим отображения')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Neumorphic' }));
    expect(props.setTile).toHaveBeenCalledWith(expect.objectContaining({ preset: 'neumorphic' }));
  });

  it('resets the active section instead of unrelated settings', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Плитки сайтов/ }));
    const uiCallsBeforeReset = props.setUi.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Сбросить раздел' }));
    expect(props.setDensity).toHaveBeenCalledWith(20);
    expect(props.setTile).toHaveBeenCalledWith(expect.objectContaining({ mode: 'standard', preset: 'glass' }));
    expect(props.setUi.mock.calls).toHaveLength(uiCallsBeforeReset);
  });

  it('keeps collapsed settings navigation accessible by section name', () => {
    const props = baseProps();
    render(<Settings {...props} />);
    expect(screen.getByRole('button', { name: 'Общие' })).toHaveAttribute('aria-label', 'Общие');
    expect(screen.getByRole('button', { name: 'Плитки сайтов' })).toHaveAttribute('aria-label', 'Плитки сайтов');
    expect(screen.getByRole('button', { name: 'Данные' })).toHaveAttribute('aria-label', 'Данные');
  });

  it('changes appearance and closes', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Оформление/ }));
    await user.click(screen.getByRole('button', { name: /Тёмная/ }));
    expect(props.setAppearance).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('restores a versioned backup through the preview and apply flow', async () => {
    const user = userEvent.setup();
    const props = {
      ...baseProps(),
      setProjects: vi.fn(),
      setSessions: vi.fn(),
      projects: [{ id: 'project-1', name: 'Work', siteIds: [] }],
      sessions: [],
    };
    const importedSite: SiteRecord = {
      title: 'Restored docs', domain: 'docs.example.com', desc: 'Documentation',
      color: '#2f7cf6', icon: 'D', category: 'Личное', tags: ['docs'],
    };
    const backup = createBackup({
      categories: [],
      groups: [],
      sites: [importedSite],
      projects: [{ id: 'imported-project', name: 'Imported', siteIds: [] }],
      sessions: [{ id: 'session-1', name: 'Morning', siteIds: [] }],
      settings: { density: 24, ui: { compact: true }, tile: { mode: 'screenshot' }, appearance: { theme: 'dark' } },
    });
    const { container } = render(<Settings {...props} />);

    await user.click(screen.getByRole('button', { name: /Данные/ }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([backup], 'nexus-backup.json', { type: 'application/json' }));

    expect(await screen.findByText('Предпросмотр импорта')).toBeInTheDocument();
    expect(screen.getByText(/1 из 1 сайт выбрано/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Применить импорт' }));

    expect(props.setSites).toHaveBeenCalledWith([expect.objectContaining({ domain: 'docs.example.com', category: 'Личное', tags: ['docs', 'импорт'] })]);
    expect(props.setDensity).toHaveBeenCalledWith(24);
    expect(props.setUi).toHaveBeenCalledWith(expect.any(Function));
    expect(props.setTile).toHaveBeenCalledWith(expect.any(Function));
    expect(props.setAppearance).toHaveBeenCalledWith(expect.any(Function));
    expect(props.setUi.mock.calls[props.setUi.mock.calls.length - 1]?.[0]({ sidebar: true })).toEqual({ sidebar: true, compact: true });
    expect(props.setTile.mock.calls[props.setTile.mock.calls.length - 1]?.[0]({ preset: 'glass' })).toEqual({ preset: 'glass', mode: 'screenshot' });
    expect(props.setAppearance.mock.calls[props.setAppearance.mock.calls.length - 1]?.[0]({ accent: '#2f7cf6' })).toEqual({ accent: '#2f7cf6', theme: 'dark' });
    expect(props.setProjects).toHaveBeenCalled();
    expect(props.setSessions).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Импорт применён: 1 сайт, 1 проект, 1 сессия.');
  });

  it('clears an earlier backup preview when a new file is selected', async () => {
    const user = userEvent.setup();
    const props = { ...baseProps(), projects: [], sessions: [], setProjects: vi.fn(), setSessions: vi.fn() };
    const { container } = render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Данные/ }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([createBackup({ sites: [], projects: [{ id: 'p', name: 'Imported', siteIds: [] }], categories: [], groups: [], sessions: [] })], 'backup.json', { type: 'application/json' }));
    expect(await screen.findByText(/1 проект/)).toBeInTheDocument();
    await user.upload(input, new File(['<DL><A HREF="https://fresh.test">Fresh</A></DL>'], 'bookmarks.html', { type: 'text/html' }));
    expect(await screen.findByText('Fresh')).toBeInTheDocument();
    expect(screen.queryByText(/1 проект/)).not.toBeInTheDocument();
  });

  it('exposes real browser bridge controls in the Data section', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Данные/ }));
    expect(screen.getByText('Подключение браузера')).toBeInTheDocument();
    expect(screen.getByText('Подключение не проверено')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Запросить открытые вкладки/ })).toBeInTheDocument();
  });

  it('does not advertise settings that have no product behavior', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);

    expect(screen.queryByText('Открывать Nexus в новой вкладке')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Поиск' }));
    expect(screen.queryByText('Поисковые подсказки')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Боковая панель' }));
    expect(screen.queryByRole('option', { name: 'Постоянно' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Приватность' }));
    expect(screen.queryByText('Анонимная статистика')).not.toBeInTheDocument();
  });
});
