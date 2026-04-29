"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { useSidebarBehavior } from "./sidebar-preference";

type AppShellProps = {
  children: ReactNode;
  displayName: string;
};

export function AppShell({ children, displayName }: AppShellProps) {
  const pathname = usePathname();
  const sidebarBehavior = useSidebarBehavior();
  const [collapsed, setCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverMode = sidebarBehavior === "hover";
  const sidebarCollapsed = hoverMode ? !hoverExpanded : collapsed;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar
        pathname={pathname}
        displayName={displayName}
        behavior={sidebarBehavior}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onHoverChange={setHoverExpanded}
      />
      <div className="min-w-0 flex-1">
        <AppTopbar pathname={pathname} />
        <main className="mx-auto w-full max-w-[1600px] px-5 py-5 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
