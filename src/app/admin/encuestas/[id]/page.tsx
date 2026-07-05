import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
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

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-shogun-black">{survey.title}</h1>
          <p className="text-sm text-gray-500">/encuesta/{survey.slug}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await toggleSurveyActiveAction(survey.id, !survey.isActive);
          }}
        >
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              survey.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {survey.isActive ? "Activa (click para desactivar)" : "Inactiva (click para activar)"}
          </button>
        </form>
      </div>

      <a
        href={`/admin/encuestas/${survey.id}/resultados`}
        className="mb-6 inline-block text-sm font-semibold text-shogun-red"
      >
        Ver resultados →
      </a>

      <QuestionEditor surveyId={survey.id} questions={survey.questions} />
    </div>
  );
}
