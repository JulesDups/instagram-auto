"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast/toast-context";
import { Toaster } from "@/components/toast/toaster";
import { EditSidebarProvider, useEditSidebar } from "@/components/edit-sidebar/edit-sidebar-context";
import { EditSidebar } from "@/components/edit-sidebar/edit-sidebar";
import { LightboxProvider } from "@/components/lightbox/lightbox-context";
import { SlideCarouselLightbox } from "@/components/lightbox/slide-carousel-lightbox";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <LightboxProvider>
        <EditSidebarProvider>
          <div className="min-h-screen bg-hg-cream text-hg-ink">
            <Sidebar />
            <Content>{children}</Content>
            <EditSidebar />
            <SlideCarouselLightbox />
            <Toaster />
          </div>
        </EditSidebarProvider>
      </LightboxProvider>
    </ToastProvider>
  );
}

function Content({ children }: { children: ReactNode }) {
  const { isOpen } = useEditSidebar();
  return (
    <main
      className={[
        "ml-60 transition-[padding,max-width] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isOpen ? "pr-[440px]" : "pr-0",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto px-12 py-12 transition-[max-width] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen ? "max-w-[900px]" : "max-w-[1280px]",
        ].join(" ")}
      >
        {children}
      </div>
    </main>
  );
}
