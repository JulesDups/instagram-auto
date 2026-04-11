"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "ghost" | "danger" | "solid";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: ReactNode;
  variant?: Variant;
  size?: "sm" | "md";
};

const base =
  "inline-flex items-center justify-center rounded-md transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  ghost: "text-hg-ink/60 hover:bg-hg-ink/5 hover:text-hg-ink",
  danger: "text-hg-rust/80 hover:bg-hg-rust/10 hover:text-hg-rust",
  solid: "bg-hg-ink text-hg-cream hover:bg-hg-ink/90",
};

const sizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  function IconButton(
    { label, icon, variant = "ghost", size = "md", className = "", type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);
