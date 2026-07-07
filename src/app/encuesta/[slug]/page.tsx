import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SurveyForm } from "@/components/survey/SurveyForm";

export const dynamic = "force-dynamic";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await db.survey.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { order: "asc" } },
      collaborators: { orderBy: { order: "asc" } },
    },
  });

  if (!survey || !survey.isActive) notFound();

  return (
    <SurveyForm
      survey={survey}
      questions={survey.questions}
      collaborators={survey.collaborators.map((c) => ({
        id: c.id,
        name: c.name,
        imageId: c.imageId,
      }))}
    />
  );
}
