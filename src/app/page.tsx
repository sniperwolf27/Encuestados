import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ListRow } from "@/components/ui/ListRow";
import { getSurveyIcon } from "@/lib/survey-icon";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-navy to-brand-navy-dark px-5 py-8">
      <div className="mb-1 flex items-center gap-2">
        <Image
          src="/logo.jpg"
          alt="David Fotocolor"
          width={36}
          height={22}
          className="rounded-md object-cover"
          priority
        />
        <span className="text-[13px] font-medium tracking-wide text-white/60">DAVID FOTOCOLOR</span>
      </div>
      <h1 className="mb-1 text-[34px] font-extrabold leading-tight tracking-tight text-white">Encuestas</h1>
      <p className="mb-7 text-[15px] text-white/55">Elige qué encuesta quieres responder</p>

      <div className="overflow-hidden rounded-2xl bg-white/8 backdrop-blur-xl">
        {surveys.map((survey, i) => {
          const Icon = getSurveyIcon(survey.emoji);
          return (
            <Link
              key={survey.id}
              href={`/encuesta/${survey.slug}`}
              className={`block active:bg-white/5 ${i > 0 ? "border-t border-white/8" : ""}`}
            >
              <ListRow icon={<Icon size={20} className="text-white" />} title={survey.title} showChevron variant="dark" />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
