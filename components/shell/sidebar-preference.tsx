"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils";

export type SidebarBehavior = "manual" | "hover";

const SIDEBAR_BEHAVIOR_KEY = "taskmaster.sidebar.behavior";
const SIDEBAR_BEHAVIOR_EVENT = "taskmaster-sidebar-behavior-change";
const SIDEBAR_BEHAVIOR_OPTIONS: Array<{
  value: SidebarBehavior;
  label: string;
  description: string;
}> = [
  {
    value: "manual",
    label: "Manual tab",
    description: "Use a small edge tab to collapse or expand the sidebar.",
  },
  {
    value: "hover",
    label: "Hover rail",
    description: "Keep icons visible and expand the sidebar on hover.",
  },
];

function readSidebarBehavior(): SidebarBehavior {
  if (typeof window === "undefined") {
    return "manual";
  }

  const saved = window.localStorage.getItem(SIDEBAR_BEHAVIOR_KEY);
  return saved === "hover" || saved === "manual" ? saved : "manual";
}

function subscribeToSidebarBehavior(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_BEHAVIOR_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_BEHAVIOR_EVENT, onStoreChange);
  };
}

export function setSidebarBehavior(value: SidebarBehavior) {
  window.localStorage.setItem(SIDEBAR_BEHAVIOR_KEY, value);
  window.dispatchEvent(new Event(SIDEBAR_BEHAVIOR_EVENT));
}

export function useSidebarBehavior(): SidebarBehavior {
  return useSyncExternalStore(
    subscribeToSidebarBehavior,
    readSidebarBehavior,
    (): SidebarBehavior => "manual",
  );
}

export function SidebarBehaviorControl() {
  const behavior = useSidebarBehavior();

  return (
    <div className="grid gap-2">
      {SIDEBAR_BEHAVIOR_OPTIONS.map((option) => {
        const selected = behavior === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={selected ? "primary" : "outline"}
            className={cx(
              "h-auto w-full justify-start px-3 py-2 text-left",
              selected ? "" : "text-muted-foreground",
            )}
            onClick={() => setSidebarBehavior(option.value)}
          >
            <span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs font-normal leading-5 opacity-80">
                {option.description}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
