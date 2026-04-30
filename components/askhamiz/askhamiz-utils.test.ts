import { describe, expect, it } from "vitest";
import {
  ASKHAMIZ_FACES,
  buildAskHamizPrompt,
  detectAskHamizMode,
  getFaceAudioSrc,
  getNextFaceIndex,
} from "./askhamiz-utils";

describe("AskHamiz utilities", () => {
  it("cycles faces in order and wraps", () => {
    expect(ASKHAMIZ_FACES.map((face) => face.label)).toEqual([
      "Happy",
      "Sad",
      "Unimpressed",
      "Geeked",
      "LockedIn",
      "ImposterAmongus",
      "TopHat",
      "Dictator",
      "Duckmiz (mog's)",
      "Persona 5",
    ]);
    expect(ASKHAMIZ_FACES[0].label).toBe("Happy");
    expect(getNextFaceIndex(0)).toBe(1);
    expect(ASKHAMIZ_FACES[getNextFaceIndex(ASKHAMIZ_FACES.length - 1)].label).toBe("Happy");
  });

  it("defines image and audio paths for every face", () => {
    for (const face of ASKHAMIZ_FACES) {
      expect(face.imageSrc).toBe(`/askhamiz/faces/${face.id}.webp`);
      expect(face.audioSrc).toMatch(/^\/askhamiz\/audio\/.+\.mp3$/);
    }
    expect(getFaceAudioSrc("happy")).toBe("/askhamiz/audio/happy.mp3");
    expect(ASKHAMIZ_FACES.find((face) => face.id === "persona-5")?.audioSrc).toBe(
      "/askhamiz/audio/persona.mp3",
    );
  });

  it("detects trigger modes case-insensitively", () => {
    expect(detectAskHamizMode("tell Herbert to chill")).toBe("herbert");
    expect(detectAskHamizMode("HAMIZ please summarize today")).toBe("hamiz");
    expect(detectAskHamizMode("homework")).toBeNull();
  });

  it("keeps the visible prompt text clean", () => {
    expect(buildAskHamizPrompt("Herbert")).toBe("Herbert");
    expect(buildAskHamizPrompt("Hamiz")).toBe("Hamiz");
  });
});
