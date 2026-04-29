import { PomodoroClient } from "@/components/study/pomodoro-client";
import { StudyMethodPage } from "@/components/study/study-method-page";

export default function PomodoroPage() {
  return (
    <StudyMethodPage
      title="Pomodoro"
      description="Alternate focused work sessions with short breaks while keeping the rest of the app usable."
      detailTitle="Blank-screen mode is scaffolded"
      detailDescription="The core timer works now. Optional blank-screen focus mode and saved history are intentionally deferred."
    >
      <PomodoroClient />
    </StudyMethodPage>
  );
}
