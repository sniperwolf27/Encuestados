export function KpiCards({
  averageRating,
  nps,
  yesPercentage,
  totalResponses,
}: {
  averageRating: number | null;
  nps: number | null;
  yesPercentage: number | null;
  totalResponses: number;
}) {
  const cards = [
    { label: "Total respuestas", value: totalResponses.toString() },
    { label: "Promedio general", value: averageRating !== null ? `${averageRating.toFixed(1)} / 5` : "—" },
    { label: "NPS", value: nps !== null ? (nps > 0 ? `+${nps}` : `${nps}`) : "—" },
    { label: "% Sí", value: yesPercentage !== null ? `${Math.round(yesPercentage)}%` : "—" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className="text-2xl font-extrabold text-brand-orange">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
