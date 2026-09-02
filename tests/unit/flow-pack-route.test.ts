import { beforeEach, describe, expect, it, vi } from "vitest";
import { flowPackSchema } from "@/lib/flow-packs";

const state = vi.hoisted(() => ({
  campaign: {
    id: "campaign-warm",
    name: "Warm Campaign",
    keyword: "WARM",
    startsOn: new Date("2026-01-01T00:00:00.000Z"),
  },
  scripts: [
    {
      id: "script-pitch",
      name: "Warm DM Pitch",
      category: "pitch",
      body: "A detailed pitch that remains healthy after a rejected import.",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "script-qualify",
      name: "Warm DM Qualify",
      category: "qualify",
      body: "A detailed qualification prompt for the healthy exported flow.",
      createdAt: new Date("2026-01-01T00:01:00.000Z"),
    },
    {
      id: "script-checkout",
      name: "Warm DM Checkout",
      category: "checkout",
      body: "A detailed checkout prompt for the healthy exported flow pack.",
      createdAt: new Date("2026-01-01T00:02:00.000Z"),
    },
    {
      id: "script-delivery",
      name: "Warm DM Delivery",
      category: "delivery",
      body: "A detailed delivery prompt for the healthy exported flow pack.",
      createdAt: new Date("2026-01-01T00:03:00.000Z"),
    },
  ],
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuthCookie: () => true }));
vi.mock("@/lib/security/request", () => ({ isTrustedMutationRequest: () => true }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(async () => state.campaign),
      findUnique: vi.fn(async () => state.campaign),
    },
    script: { findMany: vi.fn(async () => state.scripts) },
    $transaction: state.transaction,
  },
}));

import { GET, POST } from "@/app/api/flow-packs/route";

beforeEach(() => {
  state.transaction.mockClear();
});

describe("flow-pack import boundary", () => {
  it("rejects duplicate script names without writes and preserves a healthy export", async () => {
    const duplicateNamePack = {
      schemaVersion: 1,
      name: "Broken overwrite attempt",
      keyword: "WARM",
      steps: [
        {
          id: "pitch-1",
          stage: "pitch",
          scriptName: "Warm DM Pitch",
          template: "The original pitch would be overwritten without boundary validation.",
        },
        {
          id: "qualify-1",
          stage: "qualify",
          scriptName: "Warm DM Pitch",
          template: "The duplicate name must never overwrite the existing pitch row.",
        },
        {
          id: "checkout-1",
          stage: "checkout",
          scriptName: "Warm DM Checkout",
          template: "A complete checkout template keeps the pack otherwise schema-valid.",
        },
        {
          id: "delivery-1",
          stage: "delivery",
          scriptName: "Warm DM Delivery",
          template: "A complete delivery template keeps the pack otherwise schema-valid.",
        },
      ],
    };

    const importResponse = await POST(
      new Request("http://localhost:3000/api/flow-packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(duplicateNamePack),
      }),
    );

    expect(importResponse.status).toBe(400);
    expect(state.transaction).not.toHaveBeenCalled();

    const exportResponse = await GET(
      new Request("http://localhost:3000/api/flow-packs"),
    );
    expect(exportResponse.status).toBe(200);
    const exported = await exportResponse.json();
    expect(flowPackSchema.safeParse(exported).success).toBe(true);
    expect(exported.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "pitch",
          scriptName: "Warm DM Pitch",
          template: state.scripts[0].body,
        }),
      ]),
    );
  });
});
