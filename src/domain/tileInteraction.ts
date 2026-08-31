export type TileInteractionState = 'normal' | 'hover' | 'pressed' | 'selected' | 'focus-visible' | 'dragging' | 'drop-target';
export type TileInteractionEvent = 'pointer-down' | 'pointer-up' | 'focus' | 'blur' | 'drag-start' | 'drag-enter' | 'drag-leave' | 'drop' | 'drag-end';

export function nextTileState(_current: TileInteractionState, event: TileInteractionEvent, selected = false): TileInteractionState {
  if (event === 'pointer-down') return 'pressed';
  if (event === 'focus') return 'focus-visible';
  if (event === 'drag-start') return 'dragging';
  if (event === 'drag-enter') return 'drop-target';
  if (event === 'pointer-up' || event === 'blur' || event === 'drag-leave' || event === 'drop' || event === 'drag-end') return selected ? 'selected' : 'normal';
  return selected ? 'selected' : 'normal';
}
