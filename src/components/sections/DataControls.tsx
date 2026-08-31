import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { createBackup, parseBackup } from '../../domain/backup.ts';
import { useAppStore } from '../../state/useAppStore.ts';
import styles from './DataControls.module.css';

export function DataControls() {
  const tileSettings = useAppStore(state => state.tileSettings);
  const projects = useAppStore(state => state.projects);
  const categories = useAppStore(state => state.categories);
  const sites = useAppStore(state => state.sites);
  const history = useAppStore(state => state.history);
  const notes = useAppStore(state => state.notes);
  const weatherLocation = useAppStore(state => state.weatherLocation);
  const restoreBackup = useAppStore(state => state.restoreBackup);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  const exportData = () => {
    const text = createBackup({ tileSettings, projects, categories, sites, history, notes, weatherLocation });
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexus-speed-dial-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Резервная копия создана');
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      restoreBackup(parseBackup(await file.text()));
      setStatus('Данные восстановлены');
    } catch {
      setStatus('Не удалось импортировать файл');
    }
  };

  return <div className={styles.controls} data-testid="data-controls">
    <button type="button" onClick={exportData}><Download size={16}/>Экспорт JSON</button>
    <button type="button" onClick={() => inputRef.current?.click()}><Upload size={16}/>Импорт JSON</button>
    <input ref={inputRef} className={styles.file} type="file" accept="application/json,.json" onChange={importData}/>
    {status && <small role="status">{status}</small>}
  </div>;
}
