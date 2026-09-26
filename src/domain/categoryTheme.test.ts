import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PALETTE, detectTheme, nameIndex, normalizeName, themeColor, themeIcon, themeMonogram,
} from './categoryTheme';

describe('тема категории', () => {
  it('узнаёт тему по корню, а не по целому слову', () => {
    // Русский склоняется: «покупки», «покупка», «покупок» — одно и то же.
    expect(themeIcon('Покупки')).toBe('ShoppingBag');
    expect(themeIcon('Мои покупок')).toBe('ShoppingBag');
    expect(themeIcon('Учёба')).toBe('GraduationCap');
    expect(themeIcon('Обучение и курсы')).toBe('GraduationCap');
  });

  it('не спотыкается о регистр, «ё» и знаки препинания', () => {
    expect(normalizeName('Соц. Сети')).toBe('соц сети');
    expect(themeIcon('Соц. Сети')).toBe('Users');
    expect(themeIcon('СОЦСЕТИ')).toBe('Users');
    expect(themeIcon('Учеба')).toBe(themeIcon('Учёба'));
  });

  it('частное правило идёт раньше общего', () => {
    // Иначе «рабочая почта» попала бы в «работу», а не в почту.
    expect(themeIcon('Рабочая почта')).toBe('Envelope');
    expect(themeIcon('Работа')).toBe('Briefcase');
  });

  it('неузнанное название не получает ложного знака', () => {
    // Тег на «Рецептах» утверждал бы, что категория про ярлыки.
    expect(themeIcon('Всякое разное')).toBeNull();
    expect(themeIcon('Хмырь')).toBeNull();
    expect(themeIcon('')).toBeNull();
    expect(detectTheme('   ')).toBeNull();
  });

  it('цвет неузнанной категории идёт от названия, а не от порядка создания', () => {
    // Прежде хеш брался от идентификатора, и одинаковые названия в разных
    // пространствах получали разные цвета — это читалось как случайность.
    expect(themeColor('Всякое')).toBe(themeColor('всякое'));
    expect(themeColor('Всякое')).toBe(FALLBACK_PALETTE[nameIndex('Всякое')]);
    expect(FALLBACK_PALETTE).toContain(themeColor('Ерунда'));
  });

  it('узнанная категория берёт цвет темы, а не хеша', () => {
    expect(themeColor('Финансы')).toBe('#2aa879');
    expect(themeColor('Покупки')).toBe('#e0851f');
    // Цвет и знак говорят об одном: оба пришли из одной темы.
    expect(detectTheme('Финансы')?.icon).toBe('Wallet');
  });

  it('монограмма собирается из первых букв', () => {
    expect(themeMonogram('Всякое разное')).toBe('ВР');
    expect(themeMonogram('Хмырь')).toBe('Х');
    expect(themeMonogram('  ')).toBe('?');
  });

  it('каждая тема даёт и знак, и цвет', () => {
    const names = ['Почта', 'Соцсети', 'Мессенджеры', 'Развлечения', 'Музыка', 'Игры',
      'Работа', 'Учёба', 'Книги', 'Новости', 'Покупки', 'Финансы', 'Разработка',
      'Дизайн', 'Фото', 'Путешествия', 'Здоровье', 'Рецепты', 'Облако', 'Инструменты'];
    for (const name of names) {
      const theme = detectTheme(name);
      expect(theme, `тема для «${name}»`).not.toBeNull();
      expect(theme!.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
