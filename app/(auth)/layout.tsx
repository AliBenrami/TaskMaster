import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen border-t border-border bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
