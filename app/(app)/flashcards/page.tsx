import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button";
import { ScaffoldPage } from "@/components/ui/scaffold-page";

export default function FlashcardsPage() {
  return (
    <ScaffoldPage
      eyebrow="Flashcards"
      title="Flashcards"
      description="Deck generation will live here, driven by selected notes and their highlighted content."
      emptyTitle="Flashcards are scaffolded"
      emptyDescription="When this feature is built, you'll select one or more notes and generate decks directly from class-linked study content."
      action={
        <Link href="/notes" className={getButtonClassName("outline")}>
          Open notes first
        </Link>
      }
    />
  );
}
