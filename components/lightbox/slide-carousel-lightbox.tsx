"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLightbox } from "./lightbox-context";
import type { LightboxTarget } from "./lightbox-context";

export function SlideCarouselLightbox() {
  const { current, close } = useLightbox();
  if (!current) return null;
  return (
    <LightboxShell
      key={`${current.draftId}-${current.initialIndex}-${current.slideCount}`}
      target={current}
      close={close}
    />
  );
}

function LightboxShell({
  target,
  close,
}: {
  target: LightboxTarget;
  close: () => void;
}) {
  const [index, setIndex] = useState(target.initialIndex);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(target.slideCount - 1, i + 1));
  }, [target.slideCount]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, prev, next]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog on mount so keyboard navigation lands
    // inside the overlay instead of on whatever triggered it.
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const atStart = index === 0;
  const atEnd = index === target.slideCount - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du carousel"
      className="fixed inset-0 z-[90] flex flex-col bg-hg-ink/95 backdrop-blur-sm"
      style={{ animation: "var(--animate-hg-fade)" }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-hg-cream/60">
          Draft {target.draftId} · slide {index + 1} / {target.slideCount}
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="flex h-10 w-10 items-center justify-center rounded-md text-hg-cream/80 transition-colors duration-150 hover:bg-hg-cream/10 hover:text-hg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
        >
          <X width={22} height={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 md:px-12">
        <button
          type="button"
          onClick={prev}
          disabled={atStart}
          aria-label="Slide précédente"
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-hg-cream/20 text-hg-cream/90 transition-all duration-150 hover:bg-hg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold disabled:cursor-not-allowed disabled:opacity-20"
        >
          <ChevronLeft width={24} height={24} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="mx-4 flex min-w-0 flex-1 items-center justify-center md:mx-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${target.draftId}-${index}`}
            src={`/api/render/${target.draftId}/${index}`}
            alt={`Slide ${index + 1}`}
            className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            style={{ animation: "var(--animate-hg-fade)" }}
          />
        </div>

        <button
          type="button"
          onClick={next}
          disabled={atEnd}
          aria-label="Slide suivante"
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-hg-cream/20 text-hg-cream/90 transition-all duration-150 hover:bg-hg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold disabled:cursor-not-allowed disabled:opacity-20"
        >
          <ChevronRight width={24} height={24} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="flex justify-center gap-2 px-6 py-4">
        {Array.from({ length: target.slideCount }, (_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Aller à la slide ${i + 1}`}
              className={[
                "h-12 w-12 overflow-hidden rounded-md border transition-all duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold",
                active
                  ? "border-hg-gold shadow-[0_0_0_2px_rgba(212,163,116,0.5)]"
                  : "border-hg-cream/15 opacity-60 hover:opacity-90",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/render/${target.draftId}/${i}`}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
