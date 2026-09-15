import { useEffect, useState } from 'react';

const QUOTA_BYTES = 5 * 1024 * 1024;

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percent: number;
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function measureAppStorage(): number {
  let units = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith('nexus.')) continue;
    units += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return units * 2;
}

export function useStorageUsage(revision: number): StorageUsage | null {
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    try {
      const usedBytes = measureAppStorage();
      setUsage({
        usedBytes,
        quotaBytes: QUOTA_BYTES,
        percent: Math.min(100, (usedBytes / QUOTA_BYTES) * 100),
      });
    } catch {
      setUsage(null);
    }
  }, [revision]);

  return usage;
}
