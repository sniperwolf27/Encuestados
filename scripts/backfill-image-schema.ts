import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type OldOption = string;
type NewOption = { label: string; imageId?: string };

function isOldShape(options: unknown): options is OldOption[] {
  return Array.isArray(options) && options.every((o) => typeof o === "string");
}

async function migrateOptionsShape() {
  const questions = await db.question.findMany({ where: { type: "MULTIPLE_CHOICE" } });
  for (const question of questions) {
    if (isOldShape(question.options)) {
      const converted: NewOption[] = (question.options as OldOption[]).map((label) => ({ label }));
      await db.question.update({ where: { id: question.id }, data: { options: converted } });
      console.log(`Converted options for question ${question.id}`);
    }
  }
}

async function backfillFactorySnapshots() {
  const surveys = await db.survey.findMany({
    where: { factorySnapshot: { equals: Prisma.DbNull } },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  for (const survey of surveys) {
    const snapshot = {
      title: survey.title,
      description: survey.description,
      emoji: survey.emoji,
      questions: survey.questions.map((q) => ({
        type: q.type,
        text: q.text,
        required: q.required,
        order: q.order,
        options: q.options ?? null,
      })),
    };
    await db.survey.update({ where: { id: survey.id }, data: { factorySnapshot: snapshot } });
    console.log(`Backfilled factorySnapshot for survey "${survey.title}"`);
  }
}

async function main() {
  await migrateOptionsShape();
  await backfillFactorySnapshots();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
