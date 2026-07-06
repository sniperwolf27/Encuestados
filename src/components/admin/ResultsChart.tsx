"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";

export function ResultsChart({ distribution }: { distribution: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const data = [1, 2, 3, 4, 5].map((n) => ({
    stars: `${n}⭐`,
    respuestas: distribution[n as 1 | 2 | 3 | 4 | 5],
  }));

  return (
    <Card variant="solid" className="mb-6 p-4">
      <p className="mb-3 text-sm font-semibold text-brand-navy">Distribución de calificaciones</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="stars" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="respuestas" fill="#F26522" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
