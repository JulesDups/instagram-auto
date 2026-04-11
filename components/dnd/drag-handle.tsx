"use client";

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { GripVertical } from "lucide-react";

type Props = HTMLAttributes<HTMLButtonElement> & {
  disabled?: boolean;
};

export const DragHandle = forwardRef<HTMLButtonElement, Props>(
  function DragHandle({ disabled, className = "", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label="Réordonner"
        title="Glisser pour réordonner"
        disabled={disabled}
        className={[
          "inline-flex h-8 w-6 flex-none items-center justify-center rounded-md",
          "text-hg-ink/30 transition-colors duration-150",
          "hover:text-hg-ink/70 hover:bg-hg-ink/5",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          disabled ? "" : "cursor-grab active:cursor-grabbing",
          className,
        ].join(" ")}
        {...rest}
      >
        <GripVertical width={16} height={16} strokeWidth={2} aria-hidden="true" />
      </button>
    );
  },
);
