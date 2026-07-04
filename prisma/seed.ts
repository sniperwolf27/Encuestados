import { PrismaClient, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function seedAdmin() {
  const existing = await db.adminUser.findFirst();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 10);

  await db.adminUser.create({ data: { username, passwordHash } });
  console.log(`Created initial admin user "${username}"`);
}

type SeedQuestion = {
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
};

async function seedSurvey(
  slug: string,
  title: string,
  description: string,
  order: number,
  questions: SeedQuestion[]
) {
  const existing = await db.survey.findUnique({ where: { slug } });
  if (existing) return;

  await db.survey.create({
    data: {
      slug,
      title,
      description,
      order,
      questions: {
        create: questions.map((q, i) => ({
          type: q.type,
          text: q.text,
          required: q.required,
          order: i,
          options: q.options ?? undefined,
        })),
      },
    },
  });
  console.log(`Created survey "${title}"`);
}

async function main() {
  await seedAdmin();

  await seedSurvey("fotografia", "Fotografía", "Cuéntanos sobre tu sesión de fotos", 0, [
    { type: "RATING_STARS", text: "¿Cómo calificarías la calidad de las fotos?", required: true },
    { type: "YES_NO", text: "¿El fotógrafo llegó puntual?", required: true },
    { type: "NPS", text: "¿Qué tan probable es que nos recomiendes?", required: true },
    {
      type: "MULTIPLE_CHOICE",
      text: "¿Qué tipo de sesión tomaste?",
      required: true,
      options: ["Retrato", "Producto", "Evento", "Otro"],
    },
    { type: "TEXT", text: "Comentarios adicionales", required: false },
  ]);

  await seedSurvey("edicion", "Edición", "Cuéntanos sobre la edición de tus fotos", 1, [
    { type: "RATING_STARS", text: "¿Cómo calificarías la calidad de la edición final?", required: true },
    { type: "YES_NO", text: "¿El resultado cumplió con lo que esperabas?", required: true },
    { type: "RATING_STARS", text: "¿El tiempo de entrega fue el adecuado?", required: true },
    { type: "NPS", text: "¿Qué tan probable es que nos recomiendes?", required: true },
    { type: "TEXT", text: "Comentarios adicionales", required: false },
  ]);

  await seedSurvey(
    "servicio-al-cliente",
    "Servicio al Cliente",
    "Cuéntanos sobre la atención que recibiste",
    2,
    [
      { type: "RATING_STARS", text: "¿Cómo calificarías la atención recibida?", required: true },
      { type: "YES_NO", text: "¿Tu problema/solicitud fue resuelto?", required: true },
      { type: "RATING_STARS", text: "¿El personal fue amable y claro?", required: true },
      { type: "NPS", text: "¿Qué tan probable es que nos recomiendes?", required: true },
      { type: "TEXT", text: "Comentarios adicionales", required: false },
    ]
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
