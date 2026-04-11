import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, hint, error, children }: Props) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[10px] uppercase tracking-widest text-hg-ink/60"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-hg-ink/45">{hint}</p>
      )}
      {error && <p className="text-[11px] text-hg-rust">{error}</p>}
    </div>
  );
}

const inputBase =
  "w-full rounded-md border border-hg-ink/15 bg-white px-3 py-2 text-sm text-hg-ink " +
  "transition-colors duration-150 placeholder:text-hg-ink/30 " +
  "focus:border-hg-gold focus:outline-none focus:ring-2 focus:ring-hg-gold/30 " +
  "disabled:cursor-not-allowed disabled:bg-hg-ink/5";

export const inputClass = inputBase;
export const textareaClass = `${inputBase} resize-y font-sans`;
export const selectClass = inputBase;
