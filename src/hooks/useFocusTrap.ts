import { useEffect, useRef } from 'react';

const selectors = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// React applies `autoFocus` while committing the dialog, i.e. before our effect
// runs, so `document.activeElement` can already be inside the dialog by then.
// A short history of previously focused elements lets the trap still find the
// control that opened it.
const history: HTMLElement[] = [];
let listening = false;

function remember(event: FocusEvent) {
  const target = event.target as HTMLElement | null;
  if (!target || target === document.body) return;
  const index = history.indexOf(target);
  if (index >= 0) history.splice(index, 1);
  history.unshift(target);
  if (history.length > 8) history.pop();
}

function startListening() {
  if (listening || typeof document === 'undefined') return;
  document.addEventListener('focusin', remember, true);
  listening = true;
}

// Registered on import: by the time a dialog mounts its trigger has already
// been focused, so the listener has to predate the first trap.
startListening();

export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null);
  // The element that opened the dialog. Kept across re-mounts and never taken
  // from inside the dialog, so closing always returns focus to the trigger.
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const outside = (item: HTMLElement | null | undefined): item is HTMLElement =>
      !!item && item !== document.body && item.isConnected && !container.contains(item);
    if (!trigger.current) {
      const candidate = document.activeElement as HTMLElement | null;
      trigger.current = outside(candidate) ? candidate : history.find(outside) ?? null;
    }
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(selectors));
    const items = focusable();
    // Prefer the first field over the close button so keyboard users land on the form.
    (items.find(item => /^(INPUT|SELECT|TEXTAREA)$/.test(item.tagName)) ?? items[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const current = focusable();
      if (!current.length) return;
      const active = document.activeElement;
      if (event.shiftKey && active === current[0]) { event.preventDefault(); current[current.length - 1].focus(); }
      else if (!event.shiftKey && active === current[current.length - 1]) { event.preventDefault(); current[0].focus(); }
    };
    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      const previous = trigger.current;
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);

  return ref;
}
