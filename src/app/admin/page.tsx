import Link from "next/link";
import { db } from "@/lib/db";
import { getSurveyIcon } from "@/lib/survey-icon";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const surveys = await db.survey.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { responses: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-[26px] font-extrabold tracking-tight text-brand-navy">Dashboard</h1>
      <p className="mb-6 text-[13.5px] text-system-secondary">Resumen de tus encuestas</p>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => {
          const Icon = getSurveyIcon(survey.emoji);
          return (
            <Link
              key={survey.id}
              href={`/admin/encuestas/${survey.id}`}
              className="rounded-2xl border border-system-separator bg-white p-[18px] shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-orange to-orange-400">
                  <Icon size={17} className="text-white" />
                </div>
                <Badge tone={survey.isActive ? "success" : "neutral"} className="ml-auto">
                  {survey.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
              <h2 className="text-[15.5px] font-bold text-brand-navy">{survey.title}</h2>
              <p className="text-[13px] text-system-secondary">{survey._count.responses} respuestas</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
