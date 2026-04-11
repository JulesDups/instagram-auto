"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-hg-ink text-hg-cream hover:bg-hg-ink/90 active:bg-hg-ink/80 shadow-hg-sm",
  secondary:
    "bg-white text-hg-ink border border-hg-ink/15 hover:border-hg-ink/30 hover:bg-hg-ink/5",
  ghost:
    "bg-transparent text-hg-ink/70 hover:bg-hg-ink/5 hover:text-hg-ink",
  danger:
    "bg-white text-hg-rust border border-hg-rust/30 hover:bg-hg-rust/10 hover:border-hg-rust/50",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    pending = false,
    leadingIcon,
    trailingIcon,
    className = "",
    disabled,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || pending;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {pending ? <Spinner /> : leadingIcon}
      {children}
      {!pending && trailingIcon}
    </button>
  );
});
