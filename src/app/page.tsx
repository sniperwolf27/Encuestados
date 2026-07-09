import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ListRow } from "@/components/ui/ListRow";
import { getSurveyIcon } from "@/lib/survey-icon";
import { generateQrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const surveys = await db.survey.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const qrDataUrl = await generateQrDataUrl(baseUrl);

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

      <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl bg-white/8 p-5 text-center backdrop-blur-xl">
        <p className="text-[13px] text-white/55">¿Prefieres tu celular? Escanea aquí</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="Código QR para abrir esta página en tu celular"
          width={120}
          height={120}
          className="rounded-lg"
        />
      </div>
    </main>
  );
}
