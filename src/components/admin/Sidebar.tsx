import Link from "next/link";
import { db } from "@/lib/db";

export async function Sidebar() {
  const surveys = await db.survey.findMany({ orderBy: { order: "asc" } });

  return (
    <aside className="w-48 shrink-0 bg-shogun-black p-4 text-white">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-shogun-red font-black">
          S
        </div>
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
