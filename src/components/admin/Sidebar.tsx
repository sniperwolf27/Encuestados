import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getSurveyIcon } from "@/lib/survey-icon";
import { Settings, LogOut, Plus, LayoutGrid } from "lucide-react";

export async function Sidebar() {
  const surveys = await db.survey.findMany({ orderBy: { order: "asc" } });

  return (
    <aside aria-label="Navegación de administración" className="h-full w-56 shrink-0 overflow-y-auto bg-[#1b1f2b] p-4 text-white">
      <div className="mb-7 flex items-center gap-2 px-1.5">
        <Image src="/logo.jpg" alt="David Fotocolor" width={30} height={19} className="rounded object-cover" />
        <span className="text-sm font-bold">David Fotocolor</span>
      </div>

      <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">General</p>
      <Link href="/admin" aria-current="page" className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-[13.5px]">
        <LayoutGrid size={16} /> Dashboard
      </Link>

      <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/35">Encuestas</p>
      <nav className="mb-4 space-y-0.5">
        {surveys.map((survey) => {
          const Icon = getSurveyIcon(survey.emoji);
          return (
            <Link
              key={survey.id}
              href={`/admin/encuestas/${survey.id}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-white/85 hover:bg-white/10"
            >
              <Icon size={16} /> {survey.title}
            </Link>
          );
        })}
        <Link
          href="/admin/encuestas/nueva"
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-white/45 hover:bg-white/10"
        >
          <Plus size={16} /> Nueva encuesta
        </Link>
      </nav>

      <Link
        href="/admin/configuracion"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-white/45 hover:bg-white/10"
      >
        <Settings size={16} /> Configuración
      </Link>
      <form action="/admin/logout" method="POST">
        <button aria-label="Cerrar sesión" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/45 hover:bg-white/10">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </form>
    </aside>
  );
}
