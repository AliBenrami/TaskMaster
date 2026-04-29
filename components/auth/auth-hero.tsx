import Link from "next/link";

type HeroFeature = {
  title: string;
  description: string;
  icon: "sparkle" | "stack" | "bolt";
};

const FEATURES: HeroFeature[] = [
  {
    icon: "sparkle",
    title: "Drop in your syllabus",
    description:
      "We parse contacts, grading, and schedule into a real class page you can open any time.",
  },
  {
    icon: "stack",
    title: "Notes that know their class",
    description:
      "Every note is linked to a class, filterable from the sidebar, and keyboard-driven.",
  },
  {
    icon: "bolt",
    title: "Study tools, one keystroke away",
    description:
      "Pomodoro, active recall, cheat sheets, and flashcards share the same workspace.",
  },
];

function FeatureIcon({ name }: { name: HeroFeature["icon"] }) {
  const common = "h-4 w-4";
  if (name === "sparkle") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "stack") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path
          d="M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path
        d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WordMark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-[0.65rem] bg-accent text-accent-foreground shadow-[var(--shadow-card)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
          <path
            d="M5 7h14M5 12h14M5 17h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>TaskMaster</span>
    </Link>
  );
}

export function AuthHero({
  eyebrow,
  heading,
  tagline,
}: {
  eyebrow: string;
  heading: string;
  tagline: string;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-[linear-gradient(155deg,var(--surface)_0%,var(--surface-muted)_55%,color-mix(in_srgb,var(--accent)_18%,var(--surface))_130%)] p-8 shadow-[var(--shadow-card)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,var(--foreground)_1px,transparent_0)] [background-size:22px_22px]"
      />
      <div className="relative flex items-center justify-between">
        <WordMark />
        <span className="hidden rounded-full border border-border bg-surface/80 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur sm:inline-flex">
          Academic workspace
        </span>
      </div>

      <div className="relative mt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.35rem]">
          {heading}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          {tagline}
        </p>
      </div>

      <ul className="relative mt-10 space-y-4">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex gap-3 rounded-[var(--radius-lg)] border border-border/80 bg-surface/70 p-4 backdrop-blur-sm"
          >
            <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[0.65rem] bg-accent/12 text-accent">
              <FeatureIcon name={feature.icon} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {feature.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="relative mt-auto pt-10 text-xs text-muted-foreground">
        Built for students — syllabus parsing, class-linked notes, and study tools in one place.
      </div>
    </div>
  );
}
