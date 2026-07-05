type Row = {
  id: string;
  createdAt: Date;
  respondentName: string | null;
  answers: { questionText: string; value: unknown }[];
};

export function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="p-3">Fecha</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-50">
              <td className="p-3 whitespace-nowrap">{row.createdAt.toISOString().slice(0, 10)}</td>
              <td className="p-3">{row.respondentName ?? "—"}</td>
              <td className="p-3">
                <ul className="space-y-0.5">
                  {row.answers.map((a, i) => (
                    <li key={i}>
                      <span className="text-gray-400">{a.questionText}:</span> {String(a.value)}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="p-6 text-center text-gray-400">
                Sin respuestas en este rango de fechas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
