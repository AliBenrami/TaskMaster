import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { requireServerSession } from "@/lib/auth-session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireServerSession("/");

  return <AppShell displayName={session.user.name || session.user.email}>{children}</AppShell>;
}
