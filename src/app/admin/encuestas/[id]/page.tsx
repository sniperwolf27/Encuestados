import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { CollaboratorEditor } from "@/components/admin/CollaboratorEditor";
import { generateQrDataUrl } from "@/lib/qr";
import { ShareLink } from "@/components/admin/ShareLink";
import { SurveyInfoEditor } from "@/components/admin/SurveyInfoEditor";
import { ResetSurveyButton } from "@/components/admin/ResetSurveyButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  toggleSurveyActiveAction,
  toggleCollaboratorRequiredAction,
  toggleNameRequiredAction,
  togglePhoneRequiredAction,
  duplicateSurveyAction,
} from "./actions";

export default async function SurveyEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      collaborators: { orderBy: { order: "asc" } },
    },
  });

  if (!survey) notFound();

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
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
        <div className="flex gap-2">
          <form action={duplicateSurveyAction.bind(null, survey.id)}>
            <Button type="submit" variant="secondary" size="compact">
              Duplicar
            </Button>
          </form>
          <ResetSurveyButton surveyId={survey.id} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <form
          action={async () => {
            "use server";
            await toggleCollaboratorRequiredAction(survey.id, !survey.collaboratorRequired);
          }}
        >
          <button type="submit">
            <Badge tone={survey.collaboratorRequired ? "success" : "neutral"}>
              {survey.collaboratorRequired
                ? "Colaborador obligatorio"
                : "Colaborador opcional"}
            </Badge>
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await toggleNameRequiredAction(survey.id, !survey.nameRequired);
          }}
        >
          <button type="submit">
            <Badge tone={survey.nameRequired ? "success" : "neutral"}>
              {survey.nameRequired ? "Nombre obligatorio" : "Nombre opcional"}
            </Badge>
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await togglePhoneRequiredAction(survey.id, !survey.phoneRequired);
          }}
        >
          <button type="submit">
            <Badge tone={survey.phoneRequired ? "success" : "neutral"}>
              {survey.phoneRequired ? "Teléfono obligatorio" : "Teléfono opcional"}
            </Badge>
          </button>
        </form>
      </div>
      <CollaboratorEditor surveyId={survey.id} collaborators={survey.collaborators} />
      <QuestionEditor surveyId={survey.id} questions={survey.questions} />
    </div>
  );
}
