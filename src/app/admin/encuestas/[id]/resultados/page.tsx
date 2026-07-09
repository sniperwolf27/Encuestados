import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computeKpis } from "@/lib/surveys/kpis";
import { KpiCards } from "@/components/admin/KpiCards";
import { ResultsChart } from "@/components/admin/ResultsChart";
import { ResultsTable } from "@/components/admin/ResultsTable";
import { Button } from "@/components/ui/Button";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; search?: string }>;
}) {
  const { id } = await params;
  const { from, to, search } = await searchParams;

  const survey = await db.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!survey) notFound();

  const responses = await db.response.findMany({
    where: {
      surveyId: id,
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(`${to}T23:59:59`) : undefined,
      },
      ...(search
        ? {
            OR: [
              { respondentName: { contains: search, mode: "insensitive" as const } },
              { respondentPhone: { contains: search, mode: "insensitive" as const } },
              { collaborator: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { answers: true, collaborator: true },
    orderBy: { createdAt: "desc" },
  });

  const allAnswers = responses.flatMap((r) => r.answers.map((a) => ({ questionId: a.questionId, value: a.value })));
  const kpis = computeKpis(
    survey.questions.map((q) => ({ id: q.id, type: q.type, text: q.text })),
    allAnswers
  );

  const questionTextById = new Map(survey.questions.map((q) => [q.id, q.text]));
  const tableRows = responses.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    respondentName: r.respondentName,
    collaboratorName: r.collaborator?.name ?? null,
    answers: r.answers.map((a) => ({
      questionText: questionTextById.get(a.questionId) ?? "?",
      value: a.value,
    })),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[26px] font-extrabold tracking-tight text-brand-navy">Resultados: {survey.title}</h1>
        <a
          href={`/admin/encuestas/${survey.id}/resultados/export`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-system-separator bg-white px-4 py-2.5 text-sm font-bold text-brand-navy"
        >
          ⬇ Exportar CSV
        </a>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-system-separator bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-system-secondary">Buscar</label>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Nombre, teléfono o colaborador"
            className="rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-system-secondary">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-system-secondary">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg border border-system-separator px-2 py-1 text-sm"
          />
        </div>
        <Button type="submit" size="compact">
          Filtrar
        </Button>
      </form>

      <KpiCards
        averageRating={kpis.averageRating}
        nps={kpis.nps}
        yesPercentage={kpis.yesPercentage}
        totalResponses={responses.length}
      />
      <ResultsChart distribution={kpis.ratingDistribution} />
      <ResultsTable rows={tableRows} />
    </div>
  );
}
