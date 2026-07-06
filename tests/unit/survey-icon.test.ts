import { describe, it, expect } from "vitest";
import { Camera, Palette, Headphones, ClipboardList } from "lucide-react";
import { getSurveyIcon } from "@/lib/survey-icon";

describe("getSurveyIcon", () => {
  it("maps the camera emoji to the Camera icon", () => {
    expect(getSurveyIcon("📷")).toBe(Camera);
  });

  it("maps the palette emoji to the Palette icon", () => {
    expect(getSurveyIcon("🎨")).toBe(Palette);
  });

  it("maps the headphones emoji to the Headphones icon", () => {
    expect(getSurveyIcon("🎧")).toBe(Headphones);
  });

  it("falls back to ClipboardList for an unknown emoji", () => {
    expect(getSurveyIcon("🙂")).toBe(ClipboardList);
  });

  it("falls back to ClipboardList for null", () => {
    expect(getSurveyIcon(null)).toBe(ClipboardList);
  });
});
