"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";

export type ChangePasswordState = { error: string | null; success: boolean };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return { error: "Sesión expirada, vuelve a iniciar sesión", success: false };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres", success: false };
  }

  const admin = await db.adminUser.findUnique({ where: { username: session.username } });
  if (!admin) {
    return { error: "Usuario no encontrado", success: false };
  }

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) {
    return { error: "La contraseña actual no es correcta", success: false };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });

  return { error: null, success: true };
}

export type UpdateSettingsState = { error: string | null; success: boolean };

export async function updateSettingsAction(
  _prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  const alertEmail = String(formData.get("alertEmail") ?? "").trim();
  const googleReviewLink = String(formData.get("googleReviewLink") ?? "").trim();

  if (alertEmail && !alertEmail.includes("@")) {
    return { error: "El correo no parece válido", success: false };
  }

  if (googleReviewLink) {
    try {
      new URL(googleReviewLink);
    } catch {
      return { error: "El link de reseña no parece válido", success: false };
    }
  }

  await db.setting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", alertEmail: alertEmail || null, googleReviewLink: googleReviewLink || null },
    update: { alertEmail: alertEmail || null, googleReviewLink: googleReviewLink || null },
  });

  return { error: null, success: true };
}
