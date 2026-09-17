import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BrowserImportPanel } from './BrowserImportPanel';

describe('BrowserImportPanel manual fallback', () => {
  it('imports pasted URLs without requiring the browser extension', async () => {
    const user = userEvent.setup();
    const setSites = vi.fn();

    render(<BrowserImportPanel
      sites={[]}
      setSites={setSites}
      projects={[]}
      setProjects={vi.fn()}
      sessions={[]}
      setSessions={vi.fn()}
    />);

    await user.type(
      screen.getByLabelText('URL для ручного импорта'),
      'https://example.com/docs\nhttps://example.com/docs\nhttps://openai.com/research',
    );
    await user.click(screen.getByRole('button', { name: 'Подготовить URL' }));

    expect(screen.getByText(/2 уникальных вкладок/)).toBeInTheDocument();
    expect(screen.getByText(/2 выбрано/)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Категория новых сайтов' }), 'Работа');
    await user.clear(screen.getByRole('textbox', { name: 'Тег новых сайтов' }));
    await user.type(screen.getByRole('textbox', { name: 'Тег новых сайтов' }), 'исследование');
    await user.click(screen.getByRole('button', { name: 'Импортировать выбранные вкладки' }));

    expect(setSites).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ domain: 'example.com', category: 'Работа', tags: ['browser-import', 'исследование'] }),
      expect.objectContaining({ domain: 'openai.com', category: 'Работа', tags: ['browser-import', 'исследование'] }),
    ]));
  });

  it('adds imported tabs to an existing project and saves a session', async () => {
    const user = userEvent.setup();
    const setSites = vi.fn();
    const setProjects = vi.fn();
    const setSessions = vi.fn();
    const project = { id: 'project-work', name: 'Work', color: '#3988ee', icon: 'W', siteIds: [], createdAt: 1, updatedAt: 1 };

    render(<BrowserImportPanel
      sites={[]}
      setSites={setSites}
      projects={[project]}
      setProjects={setProjects}
      sessions={[]}
      setSessions={setSessions}
    />);

    await user.type(screen.getByLabelText('URL для ручного импорта'), 'https://example.com/docs');
    await user.click(screen.getByRole('button', { name: 'Подготовить URL' }));
    await user.click(screen.getByText('Назначить в Project'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Проект для вкладок' }), 'project-work');
    await user.click(screen.getByText('Сохранить как Session'));
    await user.clear(screen.getByRole('textbox', { name: 'Название сессии' }));
    await user.type(screen.getByRole('textbox', { name: 'Название сессии' }), 'Morning research');
    await user.click(screen.getByRole('button', { name: 'Импортировать выбранные вкладки' }));

    expect(setProjects).toHaveBeenCalledWith([expect.objectContaining({
      id: 'project-work', siteIds: ['example.com'],
    })]);
    expect(setSessions).toHaveBeenCalledWith([expect.objectContaining({
      name: 'Morning research', projectId: 'project-work', siteIds: ['example.com'],
    })]);
  });
});
