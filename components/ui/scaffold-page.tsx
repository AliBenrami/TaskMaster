import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type ScaffoldPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function ScaffoldPage({
  eyebrow,
  title,
  description,
  emptyTitle,
  emptyDescription,
  action,
  children,
}: ScaffoldPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
      <EmptyState eyebrow="Scaffolded" title={emptyTitle} description={emptyDescription} action={action} />
    </div>
  );
}
