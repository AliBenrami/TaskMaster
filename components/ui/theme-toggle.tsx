"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils";

export const THEME_STORAGE_KEY = "taskmaster-theme";

export type ThemePreference = "system" | "light" | "dark";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.toggle("light", resolvedTheme === "light");
  root.dataset.theme = theme;
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "system";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      if (
        (window.localStorage.getItem(THEME_STORAGE_KEY) ?? "system") === "system"
      ) {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
      {(["system", "light", "dark"] as const).map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={theme === option ? "primary" : "ghost"}
          className={cx(
            "h-8 rounded-md px-2.5 text-xs capitalize shadow-none",
            theme === option ? "" : "text-muted-foreground",
          )}
          onClick={() => handleThemeChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
