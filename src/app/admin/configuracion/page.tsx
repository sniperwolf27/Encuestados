import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const setting = await db.setting.findUnique({ where: { id: "singleton" } });

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-[26px] font-extrabold tracking-tight text-brand-navy">Configuración</h1>
      <SettingsForm alertEmail={setting?.alertEmail ?? null} googleReviewLink={setting?.googleReviewLink ?? null} />
      <ChangePasswordForm />
    </div>
  );
}
