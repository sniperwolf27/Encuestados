import { Card } from "@/components/ui/Card";

type Row = {
  id: string;
  createdAt: Date;
  respondentName: string | null;
  collaboratorName: string | null;
  answers: { questionText: string; value: unknown }[];
};

export function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <Card variant="solid" className="overflow-hidden">
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-system-separator text-system-secondary">
            <th className="p-3">Fecha</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Colaborador</th>
            <th className="p-3">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-system-separator">
              <td className="p-3 whitespace-nowrap">{row.createdAt.toISOString().slice(0, 10)}</td>
              <td className="p-3">{row.respondentName ?? "—"}</td>
              <td className="p-3">{row.collaboratorName ?? "—"}</td>
              <td className="p-3">
                <ul className="space-y-0.5">
                  {row.answers.map((a, i) => (
                    <li key={i}>
                      <span className="text-system-secondary">{a.questionText}:</span> {String(a.value)}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-system-secondary">
                Sin respuestas en este rango de fechas
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="divide-y divide-system-separator md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="space-y-1.5 p-4">
            <p className="text-xs text-system-secondary">{row.createdAt.toISOString().slice(0, 10)}</p>
            <p className="font-semibold text-brand-navy">{row.respondentName ?? "—"}</p>
            {row.collaboratorName && (
              <p className="text-xs text-system-secondary">Atendido por: {row.collaboratorName}</p>
            )}
            <ul className="space-y-0.5 text-sm">
              {row.answers.map((a, i) => (
                <li key={i}>
                  <span className="text-system-secondary">{a.questionText}:</span> {String(a.value)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-system-secondary">Sin respuestas en este rango de fechas</p>
        )}
      </div>
    </Card>
  );
}
