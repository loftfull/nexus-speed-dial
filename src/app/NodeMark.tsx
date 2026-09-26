import type React from 'react';
import {
  Airplane, Book, Briefcase, Camera, ChatCircle, Cloud, Code, Envelope, FilmSlate, ForkKnife,
  GameController, GraduationCap, Heartbeat, Home, MusicNotes, Newspaper, PenNib, ShoppingBag,
  User, Users, Wallet, Wrench, type IconProps,
} from './icons.generated';
import { themeIcon, themeMonogram, type ThemeIcon } from '../domain/categoryTheme';

// Знак дома в собранном наборе называется Home: карта иконок переименовывает
// его под привычное имя из прежнего набора.
const GLYPHS: Record<ThemeIcon, (props: IconProps) => React.ReactElement> = {
  Airplane, Book, Briefcase, Camera, ChatCircle, Cloud, Code, Envelope, FilmSlate, ForkKnife,
  GameController, GraduationCap, Heartbeat, House: Home, MusicNotes, Newspaper, PenNib, ShoppingBag,
  User, Users, Wallet, Wrench,
};

export type NodeMarkProps = { name: string; size?: number; active?: boolean };

/**
 * Знак узла — категории, группы или пространства — по его названию.
 *
 * Прежде категории и группы получали один и тот же тег, а пространства —
 * знак по порядковому номеру: первое становилось домом, второе портфелем,
 * и смысла в этом не было никакого.
 *
 * Если название не узнано, знака нет вовсе: остаётся монограмма. Показать тег
 * на «Рецептах» — значит утверждать, что категория про ярлыки, а буква честно
 * говорит «имя знаю, смысл нет».
 */
export function NodeMark({ name, size = 22, active = false }: NodeMarkProps) {
  const key = themeIcon(name);
  const Glyph = key ? GLYPHS[key] : null;
  if (Glyph) return <Glyph size={size} weight={active ? 'duotone' : 'regular'} aria-hidden="true" />;
  return (
    <span className="nx-node-mono" style={{ width: size, height: size }} aria-hidden="true">
      {themeMonogram(name)}
    </span>
  );
}
