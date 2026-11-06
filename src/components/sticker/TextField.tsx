import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cx } from "./tokens";

const FIELD_CLASS =
  "w-full rounded-(--radius-chip) border-3 border-ink bg-sticker px-4 font-note text-base text-ink shadow-sticker-sm placeholder:text-ink-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep";

type FieldShellProps = { id: string; label: string; hint?: string; children: React.ReactNode };

const FieldShell = ({ id, label, hint, children }: FieldShellProps): React.ReactElement => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="font-hand text-sm text-ink">
      {label}
    </label>
    {children}
    {hint ? <p className="min-h-lh text-xs text-ink-soft">{hint}</p> : null}
  </div>
);

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string };

export const TextField = ({ id, label, hint, className, ...rest }: TextFieldProps): React.ReactElement => (
  <FieldShell id={id} label={label} hint={hint}>
    <input id={id} className={cx(FIELD_CLASS, "min-h-12", className)} {...rest} />
  </FieldShell>
);

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string };

export const TextAreaField = ({ id, label, hint, className, ...rest }: TextAreaFieldProps): React.ReactElement => (
  <FieldShell id={id} label={label} hint={hint}>
    <textarea id={id} className={cx(FIELD_CLASS, "min-h-24 resize-none py-3 leading-relaxed", className)} {...rest} />
  </FieldShell>
);
