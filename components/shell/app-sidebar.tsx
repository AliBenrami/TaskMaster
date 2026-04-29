"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cx } from "@/lib/utils";
import { NavIconGlyph } from "./nav-icon";
import { isActivePath, primaryNavItems, studyNavItems } from "./navigation";

type AppSidebarProps = {
  pathname: string;
  displayName: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function Chevron({ direction }: { direction: "left" | "right" | "down" | "up" }) {
  const rotation = {
    left: "rotate(180deg)",
    right: "rotate(0deg)",
    down: "rotate(90deg)",
    up: "rotate(-90deg)",
  }[direction];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      style={{ transform: rotation }}
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function AppSidebar({
  pathname,
  displayName,
  collapsed,
  onToggleCollapsed,
}: AppSidebarProps) {
  const [studyOpen, setStudyOpen] = useState(() => pathname.startsWith("/study"));
  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "TM",
    [displayName],
  );

  return (
    <aside
      className={cx(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface/95 px-3 py-4 backdrop-blur",
        collapsed ? "w-[80px]" : "w-[264px]",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-2 pb-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="TaskMaster home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-accent text-accent-foreground shadow-[var(--shadow-card)]">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
              <path
                d="M5 7h14M5 12h14M5 17h8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                TaskMaster
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Academic workspace
              </p>
            </div>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted-foreground transition hover:text-foreground lg:inline-flex"
        >
          <Chevron direction={collapsed ? "right" : "left"} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {primaryNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cx(
                "group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition",
                collapsed && "justify-center px-0",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <span
                className={cx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.55rem] transition",
                  active
                    ? "text-accent"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                <NavIconGlyph name={item.icon} />
              </span>
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setStudyOpen((current) => !current)}
            aria-expanded={studyOpen}
            title={collapsed ? "Study" : undefined}
            className={cx(
              "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition",
              collapsed && "justify-center px-0",
              pathname.startsWith("/study")
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <span
              className={cx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.55rem]",
                pathname.startsWith("/study") ? "text-accent" : "text-muted-foreground",
              )}
            >
              <NavIconGlyph name="study" />
            </span>
            {!collapsed ? (
              <>
                <span className="flex-1 text-left">Study</span>
                <Chevron direction={studyOpen ? "down" : "right"} />
              </>
            ) : null}
          </button>
          {!collapsed && studyOpen ? (
            <div className="mt-1 space-y-0.5 pl-10">
              {studyNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "block rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition",
                      active
                        ? "bg-surface-muted text-foreground"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </nav>

      <div
        className={cx(
          "mt-3 space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface-muted p-3",
          collapsed && "space-y-2 p-2",
        )}
      >
        <div className={cx("flex items-center gap-3", collapsed && "justify-center")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-accent text-sm font-semibold text-accent-foreground">
            {initials}
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">Signed in</p>
            </div>
          ) : null}
        </div>
        {!collapsed ? <ThemeToggle /> : null}
        <SignOutButton />
      </div>
    </aside>
  );
}
