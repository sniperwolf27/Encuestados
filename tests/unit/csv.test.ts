import { describe, it, expect } from "vitest";
import { responsesToCsv, type ResponseForCsv, type QuestionForCsv } from "@/lib/surveys/csv";

const questions: QuestionForCsv[] = [
  { id: "q1", text: "¿Cómo calificarías la calidad?" },
  { id: "q2", text: "Comentarios" },
];

describe("responsesToCsv", () => {
  it("produces a header row with fixed columns plus one per question", () => {
    const csv = responsesToCsv(questions, []);
    const [header] = csv.split("\n");
    expect(header).toBe(
      'Fecha,Nombre,Telefono,Colaborador,"¿Cómo calificarías la calidad?","Comentarios"'
    );
  });

  it("produces one row per response with matching answer values", () => {
    const responses: ResponseForCsv[] = [
      {
        createdAt: new Date("2026-07-02T15:00:00Z"),
        respondentName: "Ana R.",
        respondentPhone: null,
        collaboratorName: "Juan Pérez",
        answers: [
          { questionId: "q1", value: 5 },
          { questionId: "q2", value: "Excelente atención" },
        ],
      },
    ];
    const csv = responsesToCsv(questions, responses);
    const rows = csv.split("\n");
    expect(rows[1]).toBe('2026-07-02,"Ana R.",,"Juan Pérez","5","Excelente atención"');
  });

  it("escapes commas and quotes inside values", () => {
    const responses: ResponseForCsv[] = [
      {
        createdAt: new Date("2026-07-02T15:00:00Z"),
        respondentName: null,
        respondentPhone: null,
        collaboratorName: null,
        answers: [
          { questionId: "q1", value: 4 },
          { questionId: "q2", value: 'Buen trabajo, "muy" profesional' },
        ],
      },
    ];
    const csv = responsesToCsv(questions, responses);
    const rows = csv.split("\n");
    expect(rows[1]).toBe('2026-07-02,,,,"4","Buen trabajo, ""muy"" profesional"');
  });
});
