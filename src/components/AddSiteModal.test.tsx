import { render, screen, waitFor } from '@testing-library/react';
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

  it('не обращается к сервису метаданных, пока это не разрешено', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: {} })));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const user = userEvent.setup();
      render(<AddSiteModal categories={[{id:'c-personal',name:'Личное'}]} onClose={vi.fn()} onSave={vi.fn()} />);
      await user.type(screen.getByLabelText('Адрес сайта'), 'linear.app');
      await new Promise(resolve => setTimeout(resolve, 800));
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('подставляет название и описание из сервиса метаданных, когда это разрешено', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { title: 'Linear', description: 'Issue tracking' } })));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const user = userEvent.setup();
      render(<AddSiteModal allowRemoteMetadata categories={[{id:'c-personal',name:'Личное'}]} onClose={vi.fn()} onSave={vi.fn()} />);
      await user.type(screen.getByLabelText('Адрес сайта'), 'linear.app');
      await waitFor(() => expect(screen.getByLabelText('Название')).toHaveValue('Linear'), { timeout: 2000 });
      expect(screen.getByLabelText('Описание')).toHaveValue('Issue tracking');
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('https://api.microlink.io?url=https%3A%2F%2Flinear.app'), expect.anything());
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
