import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-shogun-black px-4 py-16">
      <h1 className="mb-2 text-3xl font-extrabold text-white">
        SHOGUN <span className="text-shogun-red">Encuestas</span>
      </h1>
      <p className="mb-10 text-white/70">Selecciona la encuesta que quieres responder</p>
      <div className="grid w-full max-w-md gap-4">
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/encuesta/${survey.slug}`}
            className="rounded-2xl bg-white p-6 text-center text-xl font-bold text-shogun-black shadow-lg active:scale-95"
          >
            {survey.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
