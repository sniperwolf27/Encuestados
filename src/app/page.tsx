import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-4 py-16">
      <Image src="/logo.jpg" alt="David Fotocolor" width={160} height={100} className="mb-6 rounded-lg" priority />
      <h1 className="mb-2 text-3xl font-extrabold text-white">
        David Fotocolor <span className="text-brand-orange">Encuestas</span>
      </h1>
      <p className="mb-10 text-white/70">Selecciona la encuesta que quieres responder</p>
      <div className="grid w-full max-w-md gap-4">
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/encuesta/${survey.slug}`}
            className="rounded-2xl bg-white p-6 text-center text-xl font-bold text-brand-navy shadow-lg active:scale-95"
          >
            {survey.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
