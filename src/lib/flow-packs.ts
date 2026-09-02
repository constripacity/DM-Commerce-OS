import { z } from "zod";

export const flowStageSchema = z.enum([
  "pitch",
  "qualify",
  "objection",
  "checkout",
  "delivery",
]);

export const flowPackSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
  keyword: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9]+$/),
  steps: z
    .array(
      z.object({
        id: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
        stage: flowStageSchema,
        scriptName: z.string().min(2).max(80),
        template: z.string().min(20).max(600),
      }),
    )
    .min(4)
    .max(25)
    .superRefine((steps, context) => {
      const required = ["pitch", "qualify", "checkout", "delivery"];
      for (const stage of required) {
        if (!steps.some((step) => step.stage === stage)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Flow pack requires a ${stage} step`,
          });
        }
      }
      if (new Set(steps.map((step) => step.id)).size !== steps.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flow step IDs must be unique",
        });
      }
      if (new Set(steps.map((step) => step.scriptName)).size !== steps.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Flow step script names must be unique",
        });
      }
    }),
});

export type FlowPack = z.infer<typeof flowPackSchema>;

export function slugifyFlowStep(value: string, fallbackIndex: number) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return slug || `step-${fallbackIndex + 1}`;
}

export function scriptCategoryToStage(category: string) {
  return category === "objections" ? "objection" : category;
}

export function stageToScriptCategory(stage: FlowPack["steps"][number]["stage"]) {
  return stage === "objection" ? "objections" : stage;
}
