import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddSiteModal } from './AddSiteModal';

describe('AddSiteModal', () => {
  it('validates and submits a new site', async () => {
    const user = userEvent.setup(); const onSave = vi.fn();
    render(<AddSiteModal categories={[{id:'c-personal',name:'Личное'}]} onClose={vi.fn()} onSave={onSave} />);
    await user.type(screen.getByLabelText('Название'), 'Linear');
    await user.type(screen.getByLabelText('Адрес сайта'), 'https://linear.app/projects');
    await user.click(screen.getByRole('button', { name: 'Добавить сайт' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Linear',
      domain: 'linear.app',
      url: 'https://linear.app/projects',
      category: 'Личное',
    }));
  });

  it('prefills an existing site for editing', () => {
    render(<AddSiteModal categories={[{id:'c-work',name:'Работа'}]} existing={{ title: 'Figma', domain: 'figma.com', desc: 'Design', color: '#f00', icon: 'F', category: 'Работа' }} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByDisplayValue('Figma')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Редактировать сайт' })).toBeInTheDocument();
  });

  it('не сохраняет адрес, который не похож на домен', async () => {
    const user = userEvent.setup(); const onSave = vi.fn();
    render(<AddSiteModal categories={[{id:'c-personal',name:'Личное'}]} onClose={vi.fn()} onSave={onSave} />);
    await user.type(screen.getByLabelText('Название'), 'Тест');
    await user.type(screen.getByLabelText('Адрес сайта'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Добавить сайт' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Адрес сайта'));
    await user.type(screen.getByLabelText('Адрес сайта'), 'localhost:3000');
    await user.click(screen.getByRole('button', { name: 'Добавить сайт' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ domain: 'localhost:3000' }));
  });
});
