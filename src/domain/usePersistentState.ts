import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readStorage, writeStorage } from './storage';

export function usePersistentState<T>(key: string, initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStorage(key, typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue));
  useEffect(() => writeStorage(key, value), [key, value]);
  return [value, setValue];
}
