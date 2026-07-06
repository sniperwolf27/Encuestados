export type SurveyOption = { label: string; imageId?: string };

export function buildOptionsFromRows(
  labels: string[],
  imageIds: (string | null)[]
): SurveyOption[] {
  return labels
    .map((label, i) => ({ label: label.trim(), imageId: imageIds[i] ?? undefined }))
    .filter((option) => option.label.length > 0);
}
