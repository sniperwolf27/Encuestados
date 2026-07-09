import { Resend } from "resend";

export async function sendLowRatingAlert(params: {
  to: string;
  surveyTitle: string;
  respondentName: string | null;
  respondentPhone: string | null;
  createdAt: Date;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Encuestas David Fotocolor <onboarding@resend.dev>",
      to: params.to,
      subject: `Calificación baja en "${params.surveyTitle}"`,
      text: [
        "Se recibió una respuesta con calificación baja.",
        "",
        `Encuesta: ${params.surveyTitle}`,
        `Fecha: ${params.createdAt.toISOString()}`,
        `Nombre: ${params.respondentName ?? "No indicado"}`,
        `Teléfono: ${params.respondentPhone ?? "No indicado"}`,
        "",
        "Revisa los detalles completos en el panel de administración.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Failed to send low-rating alert email", err);
  }
}
