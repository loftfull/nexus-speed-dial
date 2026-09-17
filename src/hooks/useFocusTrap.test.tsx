import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function Dialog() {
  const ref = useFocusTrap<HTMLDivElement>(true);
  return <div ref={ref} role="dialog">
    <input autoFocus aria-label="Название" />
    <button>Закрыть</button>
  </div>;
}

describe('useFocusTrap', () => {
  it('ставит фокус на первое поле формы', () => {
    const { getByLabelText } = render(<Dialog />);
    expect(document.activeElement).toBe(getByLabelText('Название'));
  });

  it('возвращает фокус на кнопку, открывшую диалог', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const view = render(<Dialog />);
    // autoFocus уже увёл фокус внутрь диалога — триггер берётся из истории фокуса.
    expect(document.activeElement).not.toBe(trigger);
    view.unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('не возвращает фокус на элемент, удалённый из DOM', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const view = render(<Dialog />);
    trigger.remove();
    expect(() => view.unmount()).not.toThrow();
  });
});
