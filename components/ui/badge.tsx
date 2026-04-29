import type { HTMLAttributes } from "react";
import { cx } from "@/lib/utils";

type BadgeVariant = "neutral" | "accent" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  accent: "bg-accent-soft text-accent",
  outline: "border border-border bg-transparent text-muted-foreground",
};

export function Badge({
  className,
  children,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
