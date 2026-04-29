import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 shadow-[var(--shadow-card)] dark:bg-accent dark:text-accent-foreground",
  outline:
    "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted",
  ghost: "bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  destructive:
    "border border-red-200 bg-danger-soft text-danger hover:border-red-300 hover:bg-red-50 dark:border-red-950/70 dark:hover:bg-red-950/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function getButtonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition outline-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent/35",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={getButtonClassName(variant, size, className)} {...props}>
      {leadingIcon}
      {children}
    </button>
  );
}
