import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { generateQrDataUrl } from "@/lib/qr";
import { ShareLink } from "@/components/admin/ShareLink";
import { SurveyInfoEditor } from "@/components/admin/SurveyInfoEditor";
import { ResetSurveyButton } from "@/components/admin/ResetSurveyButton";
import { Badge } from "@/components/ui/Badge";
import { toggleSurveyActiveAction } from "./actions";

export default async function SurveyEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!survey) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${baseUrl}/encuesta/${survey.slug}`;
  const qrDataUrl = await generateQrDataUrl(publicUrl);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-brand-navy">
            {survey.emoji && <span className="mr-2">{survey.emoji}</span>}
            {survey.title}
          </h1>
          <p className="text-[13px] text-system-secondary">/encuesta/{survey.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <SurveyInfoEditor
            surveyId={survey.id}
            title={survey.title}
            description={survey.description}
            emoji={survey.emoji}
          />
          <form
            action={async () => {
              "use server";
              await toggleSurveyActiveAction(survey.id, !survey.isActive);
            }}
          >
            <button type="submit">
              <Badge tone={survey.isActive ? "success" : "neutral"}>
                {survey.isActive ? "Activa (click para desactivar)" : "Inactiva (click para activar)"}
              </Badge>
            </button>
          </form>
        </div>
      </div>

      <ShareLink url={publicUrl} qrDataUrl={qrDataUrl} />

      <div className="mb-6 flex items-center justify-between">
        <a href={`/admin/encuestas/${survey.id}/resultados`} className="text-sm font-semibold text-brand-orange">
          Ver resultados →
        </a>
        <ResetSurveyButton surveyId={survey.id} />
      </div>

      <QuestionEditor surveyId={survey.id} questions={survey.questions} />
    </div>
  );
}
