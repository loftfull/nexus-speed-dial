import React from 'react';
import {
  AlignCenter, AlignLeft, Blend, Boxes, CircleDot, Columns3, Contrast, Crosshair, Droplet, Eye,
  Frame, Gauge, Grid2X2, Hand, LayoutGrid, Layers3, MousePointerClick, Move3D, MoveVertical,
  Palette, PanelTop, Rows3, Scaling, Sparkles, Square, SquareDashed, SquareStack, Star, Sun,
  Tag, Type, Waves, Zap,
} from './icons.generated';
import {
  PRESET_LABELS, PRESET_ORDER, TILE_BOUNDS, TILE_PRESETS, backdropVisible, toTileVars,
  type TileAppearance, type TileNumberKey,
} from '../domain/tileAppearance';
import type { VisualPreset } from '../domain/types';
import { SiteIcon } from './SiteIcon';
import { Cell, Group, Pick, Switch, type ControlIcon } from './SettingControls';

type Icon = ControlIcon;

export type TileSettingsProps = {
  tile: TileAppearance;
  patch: (value: Partial<TileAppearance>) => void;
  applyPreset: (preset: VisualPreset) => void;
  siteIcons: boolean;
  setSiteIcons: (value: boolean) => void;
};

const SURFACES: [TileAppearance['surface'], string, Icon][] = [
  ['solid', 'Плотная', Square], ['tinted', 'Подложка', SquareStack], ['translucent', 'Прозрачная', Blend],
  ['gradient', 'Градиент', Waves], ['contrast', 'Тёмная', Contrast],
];
const SHADOWS: [TileAppearance['shadowStyle'], string, Icon][] = [
  ['none', 'Нет', SquareDashed], ['drop', 'Обычная', Square], ['neumorphic', 'Объёмная', Boxes],
  ['layered', 'Слоями', Layers3], ['ring', 'Свечение', CircleDot],
];
const MODES: [TileAppearance['mode'], string, Icon][] = [
  ['standard', 'Плитки', LayoutGrid], ['icon', 'Иконки', Grid2X2], ['list', 'Список', Rows3], ['preview', 'Превью', PanelTop],
];
const EASINGS: [TileAppearance['easing'], string][] = [['standard', 'Ровная'], ['soft', 'Мягкая'], ['snappy', 'Резкая']];
const FOCUS: [TileAppearance['focusRing'], string][] = [['minimal', 'Тонкое'], ['standard', 'Обычное'], ['strong', 'Заметное']];
const LOADS: [TileAppearance['loadAnimation'], string][] = [['none', 'Без'], ['fade', 'Проявление'], ['rise', 'Подъём']];

/** Плитка-образец: тот же набор переменных, что и на главной странице. */
function SampleTile({ tile, state, label }: { tile: TileAppearance; state?: 'hover' | 'press'; label: string }) {
  const site = { title: 'Figma', desc: 'Дизайн интерфейсов', domain: 'figma.com', color: '#f24e35' };
  return (
    <div className="nx-sample">
      <div className="nx-sample-stage" style={toTileVars(tile) as React.CSSProperties}>
        <div className={'nx-tile nx-tile-' + tile.mode + (state === 'hover' ? ' is-hover' : state === 'press' ? ' is-press' : '')}>
          <span className="nx-tile-face">
            <SiteIcon title={site.title} domain={site.domain} color={site.color} />
            <span className="nx-tile-name">{site.title}</span>
            <span className="nx-tile-desc">{site.desc}</span>
            <span className="nx-tile-sub">{site.domain}</span>
          </span>
          <Star className="nx-tile-star" size={14} weight="fill" aria-hidden="true" />
        </div>
      </div>
      <small>{label}</small>
    </div>
  );
}

export function TileSettings({ tile, patch, applyPreset, siteIcons, setSiteIcons }: TileSettingsProps) {
  const backdrop = backdropVisible(tile);

  return (
    <>
      <div className="nx-card">
        <h3>Готовый вид</h3>
        <p className="nx-card-hint">Девять наборов. Любой из них — отправная точка: все параметры ниже остаются доступны.</p>
        <div className="nx-presets">
          {PRESET_ORDER.map(id => {
            const sample = TILE_PRESETS[id];
            const active = tile.preset === id;
            return (
              <button key={id} type="button" className={'nx-preset' + (active ? ' on' : '')}
                aria-pressed={active} aria-label={`Готовый вид «${PRESET_LABELS[id]}»`}
                onClick={() => applyPreset(id)}>
                <span className="nx-preset-stage" style={toTileVars({ ...sample, mode: 'standard' }) as React.CSSProperties} aria-hidden="true">
                  <span className="nx-tile nx-tile-standard">
                    <span className="nx-tile-face">
                      <SiteIcon title="Figma" domain="figma.com" color="#f24e35" />
                      <span className="nx-tile-name">Figma</span>
                    </span>
                  </span>
                </span>
                <b>{PRESET_LABELS[id]}</b>
              </button>
            );
          })}
        </div>
      </div>

      <div className="nx-card">
        <h3>Как плитка отвечает на действия</h3>
        <p className="nx-card-hint">Один и тот же сайт в трёх состояниях. Меняйте параметры ниже — образцы обновляются сразу.</p>
        <div className="nx-samples">
          <SampleTile tile={tile} label="Обычная" />
          <SampleTile tile={tile} state="hover" label="Наведение" />
          <SampleTile tile={tile} state="press" label="Нажатие" />
        </div>
      </div>

      <Group title="Размер и сетка">
        <Pick icon={LayoutGrid} label="Раскладка" options={MODES.map(([id, text]) => [id, text])}
          value={tile.mode} onChange={value => patch({ mode: value as TileAppearance['mode'] })} />
        <Slider icon={Scaling} label="Ширина" field="width" tile={tile} patch={patch} />
        <Slider icon={MoveVertical} label="Высота" field="minHeight" tile={tile} patch={patch} />
        <Slider icon={Move3D} label="Отступ" field="gap" tile={tile} patch={patch} />
        <Slider icon={Frame} label="Скругление" field="radius" tile={tile} patch={patch} />
        <Slider icon={Tag} label="Иконка" field="iconSize" tile={tile} patch={patch} />
        <Slider icon={Columns3} label="Колонки" field="columns" tile={tile} patch={patch}
          format={value => (value === 0 ? 'авто' : String(value))} />
        <Pick icon={tile.align === 'left' ? AlignLeft : AlignCenter} label="Выравнивание"
          options={[['center', 'По центру'], ['left', 'Слева']]}
          value={tile.align} onChange={value => patch({ align: value as TileAppearance['align'] })} />
        <Pick icon={Type} label="Шрифт" options={[['Manrope', 'Manrope'], ['Inter', 'Inter']]}
          value={tile.font} onChange={value => patch({ font: value as TileAppearance['font'] })} />
      </Group>

      <Group title="Поверхность">
        <Pick icon={Palette} label="Подложка" options={SURFACES.map(([id, text]) => [id, text])}
          value={tile.surface} onChange={value => patch({ surface: value as TileAppearance['surface'] })} />
        <Slider icon={Droplet} label="Непрозрачность" field="opacity" tile={tile} patch={patch} unit="%" />
        <Slider icon={Sun} label="Оттенок акцента" field="tint" tile={tile} patch={patch} unit="%" />
        <Slider icon={Blend} label="Размытие фона" field="blur" tile={tile} patch={patch}
          disabled={!backdrop} why="Видно только на прозрачной подложке" />
        <Slider icon={Contrast} label="Насыщенность" field="saturation" tile={tile} patch={patch} unit="%"
          disabled={!backdrop} why="Видно только на прозрачной подложке" />
        <Slider icon={Square} label="Рамка" field="borderWidth" tile={tile} patch={patch} />
        <Slider icon={SquareDashed} label="Плотность рамки" field="borderOpacity" tile={tile} patch={patch} unit="%"
          disabled={tile.borderWidth === 0} why="Сначала задайте толщину рамки" />
        <Switch icon={Sparkles} label="Верхний блик" value={tile.innerHighlight}
          onChange={value => patch({ innerHighlight: value })} />
        <Pick icon={Layers3} label="Тень" options={SHADOWS.map(([id, text]) => [id, text])}
          value={tile.shadowStyle} onChange={value => patch({ shadowStyle: value as TileAppearance['shadowStyle'] })} />
        <Slider icon={MoveVertical} label="Глубина тени" field="shadowDepth" tile={tile} patch={patch}
          disabled={tile.shadowStyle === 'none'} why="Тень выключена" />
        <Slider icon={Waves} label="Мягкость тени" field="shadowSoftness" tile={tile} patch={patch}
          disabled={tile.shadowStyle === 'none'} why="Тень выключена" />
        <Slider icon={Droplet} label="Плотность тени" field="shadowOpacity" tile={tile} patch={patch} unit="%"
          disabled={tile.shadowStyle === 'none'} why="Тень выключена" />
      </Group>

      <Group title="Реакция на взаимодействие">
        <Slider icon={MoveVertical} label="Подъём" field="hoverLift" tile={tile} patch={patch} />
        <Slider icon={Scaling} label="Увеличение" field="hoverScale" tile={tile} patch={patch} unit="%" />
        <Slider icon={Sparkles} label="Свечение" field="hoverGlow" tile={tile} patch={patch} unit="%" />
        <Slider icon={MousePointerClick} label="Нажатие" field="pressedScale" tile={tile} patch={patch} unit="%" />
        <Slider icon={Gauge} label="Длительность" field="transitionMs" tile={tile} patch={patch} unit="мс" />
        <Pick icon={Zap} label="Кривая" options={EASINGS.map(([id, text]) => [id, text])}
          value={tile.easing} onChange={value => patch({ easing: value as TileAppearance['easing'] })} />
        <Pick icon={Crosshair} label="Кольцо фокуса" options={FOCUS.map(([id, text]) => [id, text])}
          value={tile.focusRing} onChange={value => patch({ focusRing: value as TileAppearance['focusRing'] })} />
        <Pick icon={Sparkles} label="Появление" options={LOADS.map(([id, text]) => [id, text])}
          value={tile.loadAnimation} onChange={value => patch({ loadAnimation: value as TileAppearance['loadAnimation'] })} />
        <Switch icon={Hand} label="Отклик переноса" value={tile.dragFeedback}
          onChange={value => patch({ dragFeedback: value })} />
      </Group>

      <Group title="Что показывать на плитке">
        <Switch icon={Type} label="Название" value={tile.showTitle} onChange={value => patch({ showTitle: value })} />
        <Switch icon={AlignLeft} label="Описание" value={tile.showDescription} onChange={value => patch({ showDescription: value })} />
        <Switch icon={Tag} label="Адрес" value={tile.showDomain} onChange={value => patch({ showDomain: value })} />
        <Switch icon={Layers3} label="Категория" value={tile.showCategory} onChange={value => patch({ showCategory: value })} />
        <Switch icon={Star} label="Звезда избранного" value={tile.showFavorite} onChange={value => patch({ showFavorite: value })} />
        <Switch icon={Eye} label="Логотипы сайтов" value={siteIcons} onChange={setSiteIcons} />
      </Group>
    </>
  );
}


function Slider({ icon, label, field, tile, patch, unit = 'px', format, disabled, why }: {
  icon: Icon; label: string; field: TileNumberKey; tile: TileAppearance;
  patch: (value: Partial<TileAppearance>) => void; unit?: string;
  format?: (value: number) => string; disabled?: boolean; why?: string;
}) {
  const [min, max, step] = TILE_BOUNDS[field];
  const value = tile[field];
  return (
    <Cell icon={icon} label={label} disabled={disabled} why={why} as="label">
      {/* Не <output>: это labelable-элемент, и обрамляющий <label> подписал бы его,
         а не ползунок. Значение и так читается со слайдера. */}
      <span className="nx-cell-value" aria-hidden="true">{format ? format(value) : `${value}${unit}`}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        aria-label={label}
        onChange={event => patch({ [field]: Number(event.target.value) } as Partial<TileAppearance>)} />
    </Cell>
  );
}
