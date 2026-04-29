import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cx } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  eyebrow = "Coming soon",
  className,
}: EmptyStateProps) {
  return (
    <Card className={cx("border-dashed", className)}>
      <CardHeader className="items-start text-left">
        <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </span>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
