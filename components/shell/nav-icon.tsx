import type { NavIcon } from "./navigation";

const PATHS: Record<NavIcon, React.ReactElement> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="9" rx="1.6" />
      <rect x="13" y="3" width="8" height="5" rx="1.6" />
      <rect x="13" y="10" width="8" height="11" rx="1.6" />
      <rect x="3" y="14" width="8" height="7" rx="1.6" />
    </>
  ),
  classes: (
    <>
      <path d="M3 6.5L12 3l9 3.5-9 3.5-9-3.5z" />
      <path d="M7 8.5v5.8c0 1.7 2.24 3.2 5 3.2s5-1.5 5-3.2V8.5" />
    </>
  ),
  notes: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  flashcards: (
    <>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <rect x="7" y="3" width="14" height="12" rx="2" />
    </>
  ),
  quizzes: (
    <>
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1.1-1.5 2.2V14" />
      <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  resources: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z" />
      <path d="M14 3v6h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.37.13.69.37.91.69.2.31.31.67.31 1.04V11a2 2 0 1 1 0 4h-.09c-.37 0-.73.11-1.04.31-.32.22-.56.54-.69.91z" />
    </>
  ),
  study: (
    <>
      <path d="M12 3L2 8l10 5 10-5-10-5z" />
      <path d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </>
  ),
};

export function NavIconGlyph({
  name,
  className = "h-4 w-4",
}: {
  name: NavIcon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
