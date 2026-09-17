import { useEffect, useRef } from 'react';

const selectors = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(selectors));
    const first = focusable()[0];
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const current = document.activeElement;
      if (event.shiftKey && current === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && current === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    container.addEventListener('keydown', onKeyDown);
    return () => { container.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [active]);
  return ref;
}
