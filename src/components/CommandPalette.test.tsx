import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';

describe('CommandPalette', () => {
  it('routes category search results through the category callback', async () => {
    const user = userEvent.setup();
    const onCategory = vi.fn();
    const onClose = vi.fn();

    render(<CommandPalette
      sites={[]}
      categories={['Работа']}
      history={[]}
      sessions={[]}
      onOpenSession={vi.fn()}
      onCategory={onCategory}
      onClose={onClose}
      onAddSite={vi.fn()}
      onSettings={vi.fn()}
      onFavorites={vi.fn()}
      onNotes={vi.fn()}
    />);

    await user.type(screen.getByPlaceholderText('Что вы хотите сделать?'), 'Работа');
    await user.click(screen.getByRole('button', { name: /Работа/ }));

    expect(onCategory).toHaveBeenCalledWith('Работа');
    expect(onClose).toHaveBeenCalled();
  });
});
