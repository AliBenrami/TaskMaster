"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";
import { AppSidebar } from "./app-sidebar";
import { useSidebarBehavior } from "./sidebar-preference";

type AppShellProps = {
  children: ReactNode;
  displayName: string;
};

export function AppShell({ children, displayName }: AppShellProps) {
  const pathname = usePathname();
  const isNotesRoute = pathname.startsWith("/notes");
  const sidebarBehavior = useSidebarBehavior();
  const [collapsed, setCollapsed] = useState(true);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverMode = sidebarBehavior === "hover";
  const sidebarCollapsed = hoverMode ? !hoverExpanded : collapsed;

  return (
    <div
      className={cx(
        "flex min-h-screen bg-background text-foreground",
        isNotesRoute && "h-screen overflow-hidden",
      )}
    >
      <AppSidebar
        pathname={pathname}
        displayName={displayName}
        behavior={sidebarBehavior}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onHoverChange={setHoverExpanded}
      />
      <div className="min-h-0 min-w-0 flex-1">
        {/* <AppTopbar pathname={pathname} /> */}
        <main
          className={cx(
            "w-full",
            isNotesRoute
              ? "h-full max-w-none overflow-hidden p-0"
              : "mx-auto max-w-[1600px] px-5 py-5 lg:px-6 lg:py-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
