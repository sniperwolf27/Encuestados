export type QuestionForCsv = { id: string; text: string };

export type ResponseForCsv = {
  createdAt: Date;
  respondentName: string | null;
  respondentPhone: string | null;
  answers: { questionId: string; value: unknown }[];
};

function escapeCsvField(raw: string): string {
  return `"${raw.replace(/"/g, '""')}"`;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function responsesToCsv(questions: QuestionForCsv[], responses: ResponseForCsv[]): string {
  const header = ["Fecha", "Nombre", "Telefono", ...questions.map((q) => escapeCsvField(q.text))].join(
    ","
  );

  const rows = responses.map((response) => {
    const answerByQuestionId = new Map(response.answers.map((a) => [a.questionId, a.value]));
    const answerCells = questions.map((q) => {
      const value = answerByQuestionId.get(q.id);
      if (value === undefined || value === null) return "";
      return escapeCsvField(String(value));
    });

    return [
      formatDate(response.createdAt),
      response.respondentName ? escapeCsvField(response.respondentName) : "",
      response.respondentPhone ? escapeCsvField(response.respondentPhone) : "",
      ...answerCells,
    ].join(",");
  });

  return [header, ...rows].join("\n");
}
