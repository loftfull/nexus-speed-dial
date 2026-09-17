import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SiteTile } from './SiteTile';

const site = { title: 'Figma', desc: 'Design', domain: 'figma.com', color: '#f00', icon: 'F', category: 'Проект' };
const props = () => ({ site, selected: false, onSelect: vi.fn(), onFav: vi.fn(), onToast: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onOpen: vi.fn(), onDragStart: vi.fn(), onDragEnd: vi.fn(), onDrop: vi.fn(), selectionMode: false, selectedMany: false, onToggleSelect: vi.fn() });

describe('SiteTile', () => {
  it('uses a local icon fallback without requesting a remote favicon', () => {
    const { container } = render(<SiteTile {...props()} />);
    expect(container.querySelector('.site-icon img')).not.toBeInTheDocument();
    expect(container.querySelector('.site-icon span')).toHaveTextContent('F');
  });

  it('supports favorite and edit actions without selecting the card', async () => {
    const user = userEvent.setup(); const callbacks = props();
    render(<SiteTile {...callbacks} />);
    await user.click(screen.getByRole('button', { name: 'Добавить в избранное' }));
    await user.click(screen.getByRole('button', { name: 'Редактировать' }));
    expect(callbacks.onFav).toHaveBeenCalledOnce();
    expect(callbacks.onEdit).toHaveBeenCalledOnce();
    expect(callbacks.onSelect).not.toHaveBeenCalled();
  });

  it('opens the site from keyboard focus', async () => {
    const user = userEvent.setup(); const callbacks = props();
    render(<SiteTile {...callbacks} />);
    const tile = screen.getByRole('button', { name: 'Сайт Figma' });
    tile.focus();
    await user.keyboard('{Enter}');
    expect(callbacks.onOpen).toHaveBeenCalledOnce();
  });

  it('uses the persisted screenshot URL in screenshot mode', () => {
    document.documentElement.dataset.tileMode = 'screenshot';
    const { container } = render(<SiteTile {...props()} site={{ ...site, screenshotUrl: 'https://cdn.example/screenshot.png' }} />);
    expect(container.querySelector('.tile-preview img')).toHaveAttribute('src', 'https://cdn.example/screenshot.png');
    delete document.documentElement.dataset.tileMode;
  });

  it('toggles multi-selection when selection mode is enabled', async () => {
    const user = userEvent.setup(); const callbacks = { ...props(), selectionMode: true };
    render(<SiteTile {...callbacks} />);
    await user.click(screen.getByRole('button', { name: 'Выбрать сайт' }));
    expect(callbacks.onToggleSelect).toHaveBeenCalledOnce();
  });
});
