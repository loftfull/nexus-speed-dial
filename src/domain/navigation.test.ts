import { describe, expect, it } from 'vitest';
import { getProductionSections, isProductionSection } from './navigation';

describe('production navigation registry', () => {
  it('exposes only implemented top-level sections', () => {
    expect(getProductionSections().map(section => section.id)).toEqual([
      'quick',
      'favorites',
      'recent',
      'library',
      'projects',
      'tags',
      'notes',
    ]);
  });

  it('does not advertise Downloads before a real downloads workspace exists', () => {
    expect(isProductionSection('downloads')).toBe(false);
    expect(getProductionSections().some(section => section.label === 'Загрузки')).toBe(false);
  });

  it('keeps stable Russian labels for implemented sections', () => {
    expect(getProductionSections().map(section => section.label)).toEqual([
      'Быстрый доступ',
      'Избранное',
      'Недавние',
      'Библиотека',
      'Проекты',
      'Теги',
      'Заметки',
    ]);
  });
});
