"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, getButtonClassName } from "@/components/ui/button";
import { getPageTitle } from "./navigation";

type AppTopbarProps = {
  pathname: string;
};

export function AppTopbar({ pathname }: AppTopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const title = getPageTitle(pathname);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/85 px-6 py-4 backdrop-blur">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Workspace
        </p>
        <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div ref={menuRef} className="relative">
          <Button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span aria-hidden>+</span>
            New
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-12 z-30 min-w-[220px] rounded-[var(--radius-lg)] border border-border bg-surface p-2 shadow-[var(--shadow-card)]"
            >
              <Link
                href="/notes?new=1"
                role="menuitem"
                className={getButtonClassName("ghost", "md", "w-full justify-start")}
                onClick={() => setMenuOpen(false)}
              >
                New note
              </Link>
              <Link
                href="/parse-test"
                role="menuitem"
                className={getButtonClassName(
                  "ghost",
                  "md",
                  "mt-1 w-full justify-start",
                )}
                onClick={() => setMenuOpen(false)}
              >
                Upload syllabus
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
