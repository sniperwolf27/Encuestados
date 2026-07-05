import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const surveys = await db.survey.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { responses: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-brand-navy">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/admin/encuestas/${survey.id}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold text-brand-navy">{survey.title}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  survey.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {survey.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p className="text-sm text-gray-500">{survey._count.responses} respuestas</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
