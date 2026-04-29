import { ProfileSettingsForm } from "@/components/auth/profile-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireServerSession } from "@/lib/auth-session";

export default async function SettingsPage() {
  const session = await requireServerSession("/settings");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account settings"
        description="Manage your profile, workspace appearance, and active session."
      />

      <ProfileSettingsForm
        name={session.user.name || ""}
        email={session.user.email}
      />
    </div>
  );
}
