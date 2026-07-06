import { describe, it, expect } from "vitest";
import { buildOptionsFromRows } from "@/lib/surveys/options";

describe("buildOptionsFromRows", () => {
  it("pairs labels with their resolved image ids", () => {
    const result = buildOptionsFromRows(["Ana", "Luis"], ["img1", null]);
    expect(result).toEqual([{ label: "Ana", imageId: "img1" }, { label: "Luis", imageId: undefined }]);
  });

  it("trims labels and drops blank ones", () => {
    const result = buildOptionsFromRows(["  Ana  ", "   ", "Luis"], [null, null, null]);
    expect(result).toEqual([{ label: "Ana", imageId: undefined }, { label: "Luis", imageId: undefined }]);
  });

  it("returns an empty array when there are no rows", () => {
    expect(buildOptionsFromRows([], [])).toEqual([]);
  });
});
