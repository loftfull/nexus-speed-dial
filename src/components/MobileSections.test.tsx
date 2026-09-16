import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Home, Settings } from 'lucide-react';
import { MobileSections } from './MobileSections';

describe('MobileSections', () => {
  const items = [['Главная', Home], ['Настройки', Settings]] as const;

  it('selects a section and closes the sheet', async () => {
    const user = userEvent.setup(); const setActive = vi.fn(); const onClose = vi.fn();
    render(<MobileSections items={items} active="Главная" setActive={setActive} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Настройки/ }));
    expect(setActive).toHaveBeenCalledWith('Настройки');
    expect(onClose).toHaveBeenCalledOnce();
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
