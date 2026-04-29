"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function PomodoroClient() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WORK_MINUTES * 60);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current > 1) {
          return current - 1;
        }

        const nextMode = mode === "work" ? "break" : "work";
        setMode(nextMode);
        return (nextMode === "work" ? WORK_MINUTES : BREAK_MINUTES) * 60;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, mode]);

  const progress = useMemo(() => {
    const totalSeconds = (mode === "work" ? WORK_MINUTES : BREAK_MINUTES) * 60;
    return ((totalSeconds - secondsRemaining) / totalSeconds) * 100;
  }, [mode, secondsRemaining]);

  function reset(nextMode: "work" | "break" = mode) {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsRemaining((nextMode === "work" ? WORK_MINUTES : BREAK_MINUTES) * 60);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pomodoro timer</CardTitle>
        <CardDescription>Runs fully on the client so you can keep using the rest of the app while it counts down.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground capitalize">{mode} session</span>
            <span className="text-xs text-muted-foreground">{mode === "work" ? "25 minutes" : "5 minutes"}</span>
          </div>
          <div className="h-3 rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="text-center">
          <p className="text-5xl font-semibold tracking-tight text-foreground">{formatSeconds(secondsRemaining)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRunning ? "Timer is running." : "Timer is paused."}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => setIsRunning((current) => !current)}>
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button type="button" variant="outline" onClick={() => reset()}>
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => reset(mode === "work" ? "break" : "work")}>
            Switch mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
