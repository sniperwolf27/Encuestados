export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function isValidImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type) && file.size > 0 && file.size <= MAX_IMAGE_BYTES;
}

export function resolveImageId(params: {
  existingImageId: string | null;
  removeImage: boolean;
  newImageId: string | null;
}): string | undefined {
  if (params.newImageId) return params.newImageId;
  if (params.removeImage) return undefined;
  return params.existingImageId ?? undefined;
}
