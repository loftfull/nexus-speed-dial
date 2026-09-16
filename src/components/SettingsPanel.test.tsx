import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Settings } from './SettingsPanel';

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

  it('changes appearance and closes', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Оформление/ }));
    await user.click(screen.getByRole('button', { name: /Тёмная/ }));
    expect(props.setAppearance).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('exposes real browser bridge controls in the Data section', async () => {
    const user = userEvent.setup(); const props = baseProps();
    render(<Settings {...props} />);
    await user.click(screen.getByRole('button', { name: /Данные/ }));
    expect(screen.getByText('Подключение браузера')).toBeInTheDocument();
    expect(screen.getByText('Подключение не проверено')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Запросить открытые вкладки/ })).toBeInTheDocument();
  });
});
