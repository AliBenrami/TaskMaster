"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";
import { cx } from "@/lib/utils";

const THEME_CHANGE_EVENT = "taskmaster-theme-change";
const THEME_OPTIONS = ["system", "light", "dark"] as const;

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

function subscribeToThemeChange(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToThemeChange,
    readStoredTheme,
    () => "system",
  );

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    applyTheme(storedTheme);

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
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
      {THEME_OPTIONS.map((option) => (
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
