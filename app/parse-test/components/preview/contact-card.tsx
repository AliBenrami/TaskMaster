import type { ParseTestViewModel } from "@/lib/parse-test/contracts";

export function ContactCard({ contact }: { contact: ParseTestViewModel["contacts"][number] }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{contact.name}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            {contact.role}
          </div>
        </div>
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {contact.email}
          </a>
        ) : null}
      </div>

      {contact.officeHours || contact.location ? (
        <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {contact.officeHours ? <div>Office hours: {contact.officeHours}</div> : null}
          {contact.location ? <div>Location: {contact.location}</div> : null}
        </div>
      ) : null}
    </article>
  );
}
