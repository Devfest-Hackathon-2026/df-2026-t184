import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cx } from "./tokens";

const FIELD_CLASS =
  "w-full rounded-(--radius-chip) border-3 border-ink bg-surface-raised px-4 font-note text-base text-ink shadow-sticker-sm placeholder:text-fg-subtle focus-visible:focus-ring aria-invalid:border-danger disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-disabled disabled:text-fg-subtle disabled:shadow-none disabled:placeholder:text-fg-subtle";

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
};

const describedBy = (id: string, hint?: string, error?: string): string | undefined =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

const FieldShell = ({ id, label, hint, error, required, children }: FieldShellProps): React.ReactElement => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline gap-2">
      <label htmlFor={id} className="font-hand text-sm text-ink">
        {label}
      </label>
      {required ? (
        <span className="rounded-full border border-danger bg-danger-surface px-1.5 font-hand text-[10px] leading-snug text-ink">
          必須
        </span>
      ) : null}
    </div>
    {children}
    {hint ? (
      <p id={`${id}-hint`} className="min-h-lh text-xs text-fg-subtle">
        {hint}
      </p>
    ) : null}
    {error ? (
      <p id={`${id}-error`} className="text-xs text-danger">
        {error}
      </p>
    ) : null}
  </div>
);

type FieldA11yProps = { id: string; label: string; hint?: string; error?: string; required?: boolean };

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & FieldA11yProps;

export const TextField = ({ id, label, hint, error, required, className, ...rest }: TextFieldProps): React.ReactElement => (
  <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
    <input
      id={id}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
      className={cx(FIELD_CLASS, "min-h-12", className)}
      {...rest}
    />
  </FieldShell>
);

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldA11yProps;

export const TextAreaField = ({ id, label, hint, error, required, className, ...rest }: TextAreaFieldProps): React.ReactElement => (
  <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
    <textarea
      id={id}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, hint, error)}
      className={cx(FIELD_CLASS, "min-h-24 resize-none py-3 leading-relaxed", className)}
      {...rest}
    />
  </FieldShell>
);
