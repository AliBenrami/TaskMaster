import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type StudyMethodPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  detailTitle: string;
  detailDescription: string;
  children?: ReactNode;
};

export function StudyMethodPage({
  eyebrow = "Study method",
  title,
  description,
  detailTitle,
  detailDescription,
  children,
}: StudyMethodPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
      <EmptyState eyebrow="Scaffolded" title={detailTitle} description={detailDescription} />
    </div>
  );
}
