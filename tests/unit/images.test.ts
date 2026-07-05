import { describe, it, expect } from "vitest";
import { isValidImageFile, resolveImageId, MAX_IMAGE_BYTES } from "@/lib/images";

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], "test", { type });
}

describe("isValidImageFile", () => {
  it("accepts a jpeg under the size limit", () => {
    expect(isValidImageFile(makeFile("image/jpeg", 1024))).toBe(true);
  });

  it("rejects disallowed mime types", () => {
    expect(isValidImageFile(makeFile("application/pdf", 1024))).toBe(false);
  });

  it("rejects files over the size limit", () => {
    expect(isValidImageFile(makeFile("image/png", MAX_IMAGE_BYTES + 1))).toBe(false);
  });

  it("rejects empty files", () => {
    expect(isValidImageFile(makeFile("image/png", 0))).toBe(false);
  });
});

describe("resolveImageId", () => {
  it("prefers a newly uploaded image over everything else", () => {
    const result = resolveImageId({ existingImageId: "old", removeImage: false, newImageId: "new" });
    expect(result).toBe("new");
  });

  it("returns undefined when the remove flag is set and there is no new image", () => {
    const result = resolveImageId({ existingImageId: "old", removeImage: true, newImageId: null });
    expect(result).toBeUndefined();
  });

  it("keeps the existing image when nothing changed", () => {
    const result = resolveImageId({ existingImageId: "old", removeImage: false, newImageId: null });
    expect(result).toBe("old");
  });

  it("returns undefined when there was never an image", () => {
    const result = resolveImageId({ existingImageId: null, removeImage: false, newImageId: null });
    expect(result).toBeUndefined();
  });
});
