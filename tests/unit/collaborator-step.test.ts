import { describe, it, expect } from "vitest";
import { shouldShowCollaboratorStep } from "@/lib/surveys/collaborator-step";

describe("shouldShowCollaboratorStep", () => {
  it("returns false when there are no collaborators", () => {
    expect(shouldShowCollaboratorStep(0)).toBe(false);
  });

  it("returns true when there is at least one collaborator", () => {
    expect(shouldShowCollaboratorStep(1)).toBe(true);
    expect(shouldShowCollaboratorStep(5)).toBe(true);
  });
});
