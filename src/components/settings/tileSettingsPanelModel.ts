import type { TileAppearanceSettings, TileSize } from '../../domain/types.ts';

const sizeMap: Record<TileSize, Pick<TileAppearanceSettings, 'size' | 'width' | 'height' | 'iconSize'>> = {
  S: { size: 'S', width: 128, height: 132, iconSize: 48 },
  M: { size: 'M', width: 170, height: 180, iconSize: 58 },
  L: { size: 'L', width: 196, height: 206, iconSize: 66 },
  XL: { size: 'XL', width: 220, height: 224, iconSize: 74 },
};

export function getSizePatch(size: TileSize) {
  return { ...sizeMap[size] };
}
