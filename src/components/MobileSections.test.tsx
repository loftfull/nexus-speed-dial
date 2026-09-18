import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Home, Settings } from '../app/icons.generated';
import { MobileSections } from './MobileSections';

describe('MobileSections', () => {
  const items = [['Главная', Home], ['Настройки', Settings]] as const;

  it('selects a regular section and closes the sheet', async () => {
    const user = userEvent.setup(); const setActive = vi.fn(); const onClose = vi.fn();
    render(<MobileSections items={items} active="Настройки" setActive={setActive} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Главная/ }));
    expect(setActive).toHaveBeenCalledWith('Главная');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens settings through the app shortcut when no explicit selector is supplied', async () => {
    const user = userEvent.setup(); const setActive = vi.fn(); const onClose = vi.fn(); const onKey = vi.fn();
    window.addEventListener('keydown', onKey);
    render(<MobileSections items={items} active="Главная" setActive={setActive} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Настройки/ }));
    expect(setActive).not.toHaveBeenCalled();
    expect(onKey).toHaveBeenCalledWith(expect.objectContaining({ key: ',', ctrlKey: true }));
    expect(onClose).toHaveBeenCalledOnce();
    window.removeEventListener('keydown', onKey);
  });

  it('lets the application intercept special destinations such as settings', async () => {
    const user = userEvent.setup(); const setActive = vi.fn(); const onClose = vi.fn(); const onSelect = vi.fn();
    render(<MobileSections items={items} active="Главная" setActive={setActive} onClose={onClose} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Настройки/ }));
    expect(onSelect).toHaveBeenCalledWith('Настройки');
    expect(setActive).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
