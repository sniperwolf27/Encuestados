import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/surveys/slug";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Fotografía Profesional")).toBe("fotografia-profesional");
  });

  it("strips accents", () => {
    expect(slugify("Edición")).toBe("edicion");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Servicio al Cliente (copia)")).toBe("servicio-al-cliente-copia");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  ¡Hola!  ")).toBe("hola");
  });
});
