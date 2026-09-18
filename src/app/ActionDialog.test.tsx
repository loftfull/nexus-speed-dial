import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionDialog } from './ActionDialog';

describe('ActionDialog', () => {
  it('validates a text action, submits trimmed text and closes on Escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ActionDialog
        title="Новый проект"
        description="Назовите рабочее пространство"
        input={{ label: 'Название проекта', placeholder: 'Например, Работа' }}
        confirmLabel="Создать"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Название проекта' });
    expect(input).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Создать' })).toBeDisabled();

    await user.type(input, '  Работа  ');
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledWith('Работа');

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders an explicit destructive confirmation without a native browser dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ActionDialog
        title="Очистить корзину?"
        description="Восстановить эти сайты после очистки будет нельзя."
        confirmLabel="Очистить"
        danger
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'Очистить' });
    expect(confirm).toHaveClass('danger');
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('');
  });
});
