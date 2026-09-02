import { describe, expect, it } from "vitest";
import { databaseMutationError } from "@/lib/api/database-errors";

describe("CRUD database errors", () => {
  it.each([
    ["P2002", 409, "already exists"],
    ["P2025", 404, "not found"],
    ["P2003", 409, "still referenced"],
  ])("maps Prisma %s to a stable %i response", async (code, status, message) => {
    const response = databaseMutationError({ code }, "Product");
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining(message) });
  });
});
