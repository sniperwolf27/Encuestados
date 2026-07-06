import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";

export async function Sidebar() {
  const surveys = await db.survey.findMany({ orderBy: { order: "asc" } });

  return (
    <aside className="w-48 shrink-0 bg-brand-navy p-4 text-white">
      <div className="mb-8 flex items-center gap-2">
        <Image src="/logo.jpg" alt="David Fotocolor" width={32} height={20} className="rounded" />
        <span className="font-bold">Encuestas</span>
      </div>
      <nav className="space-y-1 text-sm">
        <Link href="/admin" className="block rounded px-2 py-1 hover:bg-white/10">
          Dashboard
        </Link>
        {surveys.map((survey) => (
          <Link
            key={survey.id}
            href={`/admin/encuestas/${survey.id}`}
            className="block rounded px-2 py-1 hover:bg-white/10"
          >
            {survey.emoji && <span className="mr-1">{survey.emoji}</span>}
            {survey.title}
          </Link>
        ))}
        <Link
          href="/admin/encuestas/nueva"
          className="mt-2 block rounded px-2 py-1 text-white/70 hover:bg-white/10"
        >
          + Nueva encuesta
        </Link>
        <Link
          href="/admin/configuracion"
          className="mt-4 block rounded px-2 py-1 text-white/60 hover:bg-white/10"
        >
          Configuración
        </Link>
        <form action="/admin/logout" method="POST">
          <button className="mt-1 block w-full rounded px-2 py-1 text-left text-white/60 hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </aside>
  );
}
