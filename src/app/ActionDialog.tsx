import { useId, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

export type ActionDialogProps = {
  title: string;
  description?: string;
  input?: {
    label: string;
    placeholder?: string;
    initialValue?: string;
  };
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function ActionDialog({
  title,
  description,
  input,
  confirmLabel,
  cancelLabel = 'Отмена',
  danger = false,
  onConfirm,
  onClose,
}: ActionDialogProps) {
  const dialogRef = useFocusTrap<HTMLElement>(true);
  const titleId = useId();
  const descriptionId = useId();
  const [value, setValue] = useState(input?.initialValue ?? '');
  const submittedValue = input ? value.trim() : '';
  const disabled = Boolean(input && !submittedValue);

  const confirm = () => {
    if (disabled) return;
    onConfirm(submittedValue);
  };

  return (
    <div className="nx-dialog-layer" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        ref={dialogRef}
        className="nx-action-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="nx-action-dialog-copy">
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>

        <form onSubmit={event => { event.preventDefault(); confirm(); }}>
          {input && (
            <label className="nx-action-field">
              <span>{input.label}</span>
              <input
                value={value}
                placeholder={input.placeholder}
                aria-label={input.label}
                onChange={event => setValue(event.target.value)}
              />
            </label>
          )}

          <div className="nx-action-dialog-actions">
            <button type="button" className="nx-dialog-cancel" onClick={onClose}>{cancelLabel}</button>
            <button type="submit" className={danger ? 'danger' : 'primary'} disabled={disabled}>{confirmLabel}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
