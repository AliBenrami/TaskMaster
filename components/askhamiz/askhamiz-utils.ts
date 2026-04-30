export const ASKHAMIZ_FACE_IDS = [
  "happy",
  "sad",
  "unimpressed",
  "geeked",
  "locked-in",
  "imposter-amongus",
  "top-hat",
  "dictator",
  "duck",
  "persona-5",
] as const;

export type AskHamizFaceId = (typeof ASKHAMIZ_FACE_IDS)[number];
export type AskHamizFace = {
  id: AskHamizFaceId;
  label: string;
  imageSrc: string;
  audioSrc: string;
};
export type AskHamizMode = "herbert" | "hamiz";

function getFaceImageSrc(id: AskHamizFaceId) {
  return `/askhamiz/faces/${id}.webp`;
}

export function getFaceAudioSrc(id: AskHamizFaceId) {
  return `/askhamiz/audio/${id}.mp3`;
}

function getAudioFileSrc(fileName: string) {
  return `/askhamiz/audio/${encodeURIComponent(fileName)}`;
}

export const ASKHAMIZ_FACES: AskHamizFace[] = [
  {
    id: "happy",
    label: "Happy",
    imageSrc: getFaceImageSrc("happy"),
    audioSrc: getAudioFileSrc("2-06. My Homie.mp3"),
  },
  {
    id: "sad",
    label: "Sad",
    imageSrc: getFaceImageSrc("sad"),
    audioSrc: getAudioFileSrc("supersad.mp3"),
  },
  {
    id: "unimpressed",
    label: "Unimpressed",
    imageSrc: getFaceImageSrc("unimpressed"),
    audioSrc: getAudioFileSrc("1-12. Tension.mp3"),
  },
  {
    id: "geeked",
    label: "Geeked",
    imageSrc: getFaceImageSrc("geeked"),
    audioSrc: getAudioFileSrc("2-06. My Homie.mp3"),
  },
  {
    id: "locked-in",
    label: "LockedIn",
    imageSrc: getFaceImageSrc("locked-in"),
    audioSrc: getAudioFileSrc("1-12. Tension.mp3"),
  },
  {
    id: "imposter-amongus",
    label: "ImposterAmongus",
    imageSrc: getFaceImageSrc("imposter-amongus"),
    audioSrc: getAudioFileSrc("1-12. Tension.mp3"),
  },
  {
    id: "top-hat",
    label: "TopHat",
    imageSrc: getFaceImageSrc("top-hat"),
    audioSrc: getAudioFileSrc("1-09. Beneath the Mask -instrumental version-.mp3"),
  },
  {
    id: "dictator",
    label: "Dictator",
    imageSrc: getFaceImageSrc("dictator"),
    audioSrc: getAudioFileSrc("3-09. Disquiet.mp3"),
  },
  {
    id: "duck",
    label: "Duckmiz (mog's)",
    imageSrc: getFaceImageSrc("duck"),
    audioSrc: getAudioFileSrc("mog.mp3"),
  },
  {
    id: "persona-5",
    label: "Persona 5",
    imageSrc: getFaceImageSrc("persona-5"),
    audioSrc: "/askhamiz/audio/persona.mp3",
  },
];

export function getNextFaceIndex(currentIndex: number) {
  return (currentIndex + 1) % ASKHAMIZ_FACES.length;
}

export function getFaceInitials(face: AskHamizFace) {
  return face.label
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function detectAskHamizMode(value: string): AskHamizMode | null {
  if (/\bherbert\b/i.test(value)) {
    return "herbert";
  }

  if (/\bhamiz\b/i.test(value)) {
    return "hamiz";
  }

  return null;
}

export function buildAskHamizPrompt(value: string) {
  return value;
}
