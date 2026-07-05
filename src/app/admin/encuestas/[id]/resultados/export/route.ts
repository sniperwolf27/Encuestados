import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { responsesToCsv } from "@/lib/surveys/csv";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: { include: { answers: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
  }

  const csv = responsesToCsv(
    survey.questions.map((q) => ({ id: q.id, text: q.text })),
    survey.responses.map((r) => ({
      createdAt: r.createdAt,
      respondentName: r.respondentName,
      respondentPhone: r.respondentPhone,
      answers: r.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${survey.slug}-respuestas.csv"`,
    },
  });
}
