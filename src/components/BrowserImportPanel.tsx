import { useMemo, useState } from 'react';
import { CheckCircle2, FolderPlus, Monitor, RefreshCw, Save, Unplug } from 'lucide-react';
import type { BrowserSession, Project, SiteRecord } from '../domain/types';
import {
  checkBrowserExtension,
  isSupportedBrowserImportUrl,
  prepareBrowserImport,
  requestBrowserTabs,
  type BrowserTab,
} from '../domain/browserBridge';
import './browser-import.css';

type Setter<T> = (value: T | ((current: T) => T)) => void;

type Props = {
  sites: SiteRecord[];
  setSites: Setter<SiteRecord[]>;
  projects: Project[];
  setProjects?: Setter<Project[]>;
  sessions: BrowserSession[];
  setSessions?: Setter<BrowserSession[]>;
};

type ConnectionState = 'idle' | 'checking' | 'connected' | 'missing';

function makeId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initialExtensionId() {
  try {
    return localStorage.getItem('nexus-extension-id') ?? '';
  } catch {
    return '';
  }
}

function hostLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

export function BrowserImportPanel({ sites, setSites, projects, setProjects, sessions, setSessions }: Props) {
  const [extensionId, setExtensionId] = useState(initialExtensionId);
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [error, setError] = useState('');
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [addToProject, setAddToProject] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [saveSession, setSaveSession] = useState(false);
  const [sessionName, setSessionName] = useState('Открытые вкладки');
  const [result, setResult] = useState('');

  const selectedTabs = useMemo(
    () => tabs.filter(tab => selectedUrls.includes(tab.url) && isSupportedBrowserImportUrl(tab.url)),
    [tabs, selectedUrls],
  );
  const previewPlan = useMemo(() => prepareBrowserImport(selectedTabs, sites), [selectedTabs, sites]);
  const importableTabs = useMemo(() => tabs.filter(tab => isSupportedBrowserImportUrl(tab.url)), [tabs]);
  const unsupportedTabCount = tabs.length - importableTabs.length;

  const saveExtensionId = (value: string) => {
    setExtensionId(value);
    setConnection('idle');
    setError('');
    try {
      localStorage.setItem('nexus-extension-id', value.trim());
    } catch {
      // Local storage can be blocked; connection still works for the current session.
    }
  };

  const checkConnection = async () => {
    setConnection('checking');
    setError('');
    setResult('');
    try {
      await checkBrowserExtension(extensionId);
      setConnection('connected');
    } catch (cause) {
      setConnection('missing');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const loadTabs = async () => {
    setConnection('checking');
    setError('');
    setResult('');
    try {
      const openTabs = await requestBrowserTabs(extensionId);
      setTabs(openTabs);
      setSelectedUrls(openTabs.filter(tab => isSupportedBrowserImportUrl(tab.url)).map(tab => tab.url));
      setConnection('connected');
      if (!openTabs.length) setResult('Extension подключён, но доступных вкладок не найдено.');
    } catch (cause) {
      setConnection('missing');
      setTabs([]);
      setSelectedUrls([]);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const applyImport = () => {
    setError('');
    setResult('');
    if (!selectedTabs.length) {
      setError('Выберите хотя бы одну HTTP/HTTPS вкладку для импорта.');
      return;
    }

    const plan = prepareBrowserImport(selectedTabs, sites);
    if (!plan.siteIds.length) {
      setError('Выбранные вкладки нельзя добавить в текущую модель Nexus.');
      return;
    }

    let targetProject: Project | undefined;
    let newProject: Project | undefined;
    if (addToProject) {
      if (!setProjects) {
        setError('Project storage недоступен в текущем контексте.');
        return;
      }
      if (projectId) {
        targetProject = projects.find(item => item.id === projectId);
        if (!targetProject) {
          setError('Выбранный проект больше не существует.');
          return;
        }
      } else {
        const name = newProjectName.trim();
        if (!name) {
          setError('Введите название нового проекта или выберите существующий.');
          return;
        }
        const now = Date.now();
        newProject = {
          id: makeId('project'),
          name,
          color: '#3988ee',
          icon: 'Folder',
          siteIds: plan.siteIds,
          createdAt: now,
          updatedAt: now,
        };
      }
    }

    const nextSessionName = sessionName.trim();
    if (saveSession) {
      if (!setSessions) {
        setError('Session storage недоступен в текущем контексте.');
        return;
      }
      if (!nextSessionName) {
        setError('Введите название сессии.');
        return;
      }
    }

    if (plan.newSites.length) setSites([...plan.newSites, ...sites]);

    let projectLabel = '';
    let sessionProjectId: string | undefined;
    if (addToProject && setProjects) {
      if (targetProject) {
        setProjects(projects.map(item => item.id === targetProject?.id ? {
          ...item,
          siteIds: Array.from(new Set([...item.siteIds, ...plan.siteIds])),
          updatedAt: Date.now(),
        } : item));
        sessionProjectId = targetProject.id;
        projectLabel = ` · проект «${targetProject.name}» обновлён`;
      } else if (newProject) {
        setProjects([newProject, ...projects]);
        sessionProjectId = newProject.id;
        projectLabel = ` · создан проект «${newProject.name}»`;
      }
    }

    let sessionLabel = '';
    if (saveSession && setSessions) {
      const session: BrowserSession = {
        id: makeId('session'),
        name: nextSessionName,
        projectId: sessionProjectId,
        siteIds: plan.siteIds,
        createdAt: Date.now(),
      };
      setSessions([session, ...sessions]);
      sessionLabel = ` · сессия «${nextSessionName}» сохранена`;
    }

    const details = [
      `${plan.newSites.length} новых сайтов`,
      plan.existingDomainMatches ? `${plan.existingDomainMatches} уже были в Nexus` : '',
      plan.collapsedTabCount ? `${plan.collapsedTabCount} вкладок объединено по домену` : '',
    ].filter(Boolean).join(' · ');
    setResult(`Импорт завершён: ${details}${projectLabel}${sessionLabel}.`);
    setSelectedUrls([]);
  };

  const statusText = connection === 'connected'
    ? 'Extension подключён'
    : connection === 'checking'
      ? 'Проверка подключения…'
      : connection === 'missing'
        ? 'Extension не подключён'
        : 'Подключение не проверено';

  return <div className="settings-card browser-import-card">
    <div className="browser-import-head">
      <div>
        <h4>Подключение браузера</h4>
        <p className="card-text">Получайте список открытых вкладок только после явного запроса через Nexus Workspace Bridge.</p>
      </div>
      <span className={`browser-status ${connection}`}><span></span>{statusText}</span>
    </div>

    <div className="browser-extension-row">
      <label>
        <span>ID расширения Chrome / Edge</span>
        <input
          value={extensionId}
          onChange={event => saveExtensionId(event.target.value)}
          placeholder="32-символьный ID из chrome://extensions"
          spellCheck={false}
          autoComplete="off"
          aria-label="ID расширения Nexus Workspace Bridge"
        />
        <small>Developer mode → Nexus Workspace Bridge → ID. Это идентификатор расширения, не пароль и не токен.</small>
      </label>
      <div className="browser-extension-actions">
        <button type="button" className="outline" onClick={checkConnection} disabled={connection === 'checking'}>
          {connection === 'connected' ? <CheckCircle2 size={15}/> : <Unplug size={15}/>} Проверить
        </button>
        <button type="button" className="save" onClick={loadTabs} disabled={connection === 'checking'}>
          <RefreshCw size={15}/> Запросить открытые вкладки
        </button>
      </div>
    </div>

    {error && <div className="browser-import-message error" role="alert">{error}</div>}
    {result && <div className="browser-import-message success" role="status">{result}</div>}

    {tabs.length > 0 && <div className="browser-tabs-preview">
      <div className="browser-preview-head">
        <div>
          <b>Предпросмотр вкладок</b>
          <small>{selectedTabs.length} выбрано · {tabs.length} уникальных вкладок · {previewPlan.newSites.length} новых доменов</small>
        </div>
        <div>
          <button type="button" onClick={() => setSelectedUrls(importableTabs.map(tab => tab.url))}>Выбрать все</button>
          <button type="button" onClick={() => setSelectedUrls([])}>Снять все</button>
        </div>
      </div>

      <div className="browser-tabs-list">
        {tabs.map(tab => {
          const supported = isSupportedBrowserImportUrl(tab.url);
          const checked = selectedUrls.includes(tab.url);
          return <label key={tab.url} className={`browser-tab-row ${supported ? '' : 'unsupported'}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled={!supported}
              onChange={() => setSelectedUrls(items => items.includes(tab.url) ? items.filter(url => url !== tab.url) : [...items, tab.url])}
            />
            <span className="browser-tab-icon"><Monitor size={15}/></span>
            <span className="browser-tab-copy">
              <b>{tab.title}</b>
              <small>{hostLabel(tab.url)}{tab.pinned ? ' · закреплена' : ''}{!supported ? ' · только preview' : ''}</small>
            </span>
          </label>;
        })}
      </div>

      <div className="browser-import-destination">
        <div className="browser-model-note">
          <b>Speed Dial + Library</b>
          <span>В текущей модели оба раздела используют общий SiteRecord. Новые домены появятся в общем наборе сайтов; отдельный Library-only тип относится к следующему этапу.</span>
        </div>

        <label className="browser-option">
          <input type="checkbox" checked={addToProject} onChange={event => setAddToProject(event.target.checked)}/>
          <span><FolderPlus size={16}/> Назначить в Project</span>
        </label>
        {addToProject && <div className="browser-project-fields">
          <select aria-label="Проект для вкладок" value={projectId} onChange={event => setProjectId(event.target.value)}>
            <option value="">Создать новый проект</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          {!projectId && <input aria-label="Название нового проекта" value={newProjectName} onChange={event => setNewProjectName(event.target.value)} placeholder="Название нового проекта"/>}
        </div>}

        <label className="browser-option">
          <input type="checkbox" checked={saveSession} onChange={event => setSaveSession(event.target.checked)}/>
          <span><Save size={16}/> Сохранить как Session</span>
        </label>
        {saveSession && <input className="browser-session-name" aria-label="Название сессии" value={sessionName} onChange={event => setSessionName(event.target.value)} placeholder="Название сессии"/>}
      </div>

      <div className="browser-import-summary">
        <span>{previewPlan.existingDomainMatches} вкладок уже представлены сохранёнными сайтами</span>
        <span>{previewPlan.collapsedTabCount} будут объединены по домену</span>
        {unsupportedTabCount > 0 && <span>{unsupportedTabCount} FTP-вкладок доступны только для просмотра</span>}
      </div>

      <button type="button" className="save browser-import-apply" onClick={applyImport} disabled={!selectedTabs.length}>
        Импортировать выбранные вкладки
      </button>
    </div>}
  </div>;
}
