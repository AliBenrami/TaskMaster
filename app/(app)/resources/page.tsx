import { ScaffoldPage } from "@/components/ui/scaffold-page";

export default function ResourcesPage() {
  return (
    <ScaffoldPage
      eyebrow="Resources"
      title="Resources"
      description="This page will surface subject-specific YouTube links and other free study material around your classes."
      emptyTitle="Resources are scaffolded"
      emptyDescription="No scraping or recommendation logic is running yet, but this is where class-aware external references will live."
    />
  );
}
