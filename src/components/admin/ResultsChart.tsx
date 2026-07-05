"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export function ResultsChart({ distribution }: { distribution: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const data = [1, 2, 3, 4, 5].map((n) => ({
    stars: `${n}⭐`,
    respuestas: distribution[n as 1 | 2 | 3 | 4 | 5],
  }));

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-shogun-black">Distribución de calificaciones</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="stars" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="respuestas" fill="#E03A21" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
