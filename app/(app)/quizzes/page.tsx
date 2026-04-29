import { Button } from "@/components/ui/button";
import { ScaffoldPage } from "@/components/ui/scaffold-page";

export default function QuizzesPage() {
  return (
    <ScaffoldPage
      eyebrow="Quizzing"
      title="Quizzes"
      description="Quiz generation will support both unlimited question mode and exam-style sets, using notes as source context."
      emptyTitle="Quiz flows are scaffolded"
      emptyDescription="Difficulty controls, weak-topic tracking, and note-driven question generation will appear here once the quiz backend is implemented."
      action={
        <Button type="button" disabled>
          Create quiz
        </Button>
      }
    />
  );
}
