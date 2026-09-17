import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CalendarPopover } from './CalendarPopover';

describe('CalendarPopover', () => {
  it('renders a calendar and navigates months', async () => {
    const user = userEvent.setup();
    render(<CalendarPopover onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Календарь' })).toBeInTheDocument();
    const month = screen.getByRole('dialog').querySelector('b')?.textContent;
    await user.click(screen.getByRole('button', { name: 'Следующий месяц' }));
    expect(screen.getByRole('dialog').querySelector('b')?.textContent).not.toBe(month);
  });

  it('closes when clicking outside the popover', async () => {
    const user = userEvent.setup(); const onClose = vi.fn();
    render(<CalendarPopover onClose={onClose} />);
    await user.click(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls close from the close button', async () => {
    const user = userEvent.setup(); const onClose = vi.fn();
    render(<CalendarPopover onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Закрыть календарь' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
