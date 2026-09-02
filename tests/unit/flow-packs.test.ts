import { describe, expect, it } from "vitest";
import { flowPackSchema } from "@/lib/flow-packs";

const validPack = {
  schemaVersion: 1,
  name: "Creator Guide",
  keyword: "GUIDE",
  steps: [
    { id: "pitch-1", stage: "pitch", scriptName: "Pitch", template: "A sufficiently detailed pitch template." },
    { id: "qualify-1", stage: "qualify", scriptName: "Qualify", template: "A sufficiently detailed qualify template." },
    { id: "checkout-1", stage: "checkout", scriptName: "Checkout", template: "A sufficiently detailed checkout template." },
    { id: "delivery-1", stage: "delivery", scriptName: "Delivery", template: "A sufficiently detailed delivery template." },
  ],
} as const;

describe("portable flow packs", () => {
  it("accepts a complete versioned deterministic flow", () => {
    expect(flowPackSchema.safeParse(validPack).success).toBe(true);
  });

  it("rejects missing required stages and duplicate IDs", () => {
    const broken = {
      ...validPack,
      steps: [validPack.steps[0], validPack.steps[0], validPack.steps[1], validPack.steps[2]],
    };
    const parsed = flowPackSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message).join(" ")).toMatch(
        /delivery|unique/,
      );
    }
  });

  it("rejects duplicate script names before import can overwrite a stage", () => {
    const broken = {
      ...validPack,
      steps: validPack.steps.map((step, index) =>
        index === 1 ? { ...step, scriptName: validPack.steps[0].scriptName } : step,
      ),
    };
    const parsed = flowPackSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        "Flow step script names must be unique",
      );
    }
  });
});
