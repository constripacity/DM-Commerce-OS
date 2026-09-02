import { beforeEach, describe, expect, it, vi } from "vitest";

const logoPath = "/api/uploads/123e4567-e89b-42d3-a456-426614174000.png";
const filename = "123e4567-e89b-42d3-a456-426614174000.png";
const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const state = vi.hoisted(() => ({
  authenticated: true,
  storedLogoPath: "/api/uploads/123e4567-e89b-42d3-a456-426614174000.png",
  readUpload: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuthCookie: () => state.authenticated,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    setting: {
      findUnique: vi.fn(async () => ({ logoPath: state.storedLogoPath })),
    },
  },
}));
vi.mock("@/lib/security/managed-uploads", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/security/managed-uploads")>();
  return { ...original, readManagedLogoUpload: state.readUpload };
});

import { GET } from "@/app/api/uploads/[filename]/route";

beforeEach(() => {
  state.authenticated = true;
  state.storedLogoPath = logoPath;
  state.readUpload.mockReset();
  state.readUpload.mockResolvedValue({ bytes, contentType: "image/png" });
});

describe("managed logo route", () => {
  it("returns authenticated current-logo bytes with immutable private headers", async () => {
    const response = await GET(new Request(`http://localhost:3000${logoPath}`), {
      params: Promise.resolve({ filename }),
    });

    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe(String(bytes.length));
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("vary")).toBe("Cookie");
  });

  it("returns a no-store 401 before resolving files for anonymous callers", async () => {
    state.authenticated = false;
    const response = await GET(new Request(`http://localhost:3000${logoPath}`), {
      params: Promise.resolve({ filename }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.readUpload).not.toHaveBeenCalled();
  });

  it("returns a no-store 404 for a valid but unreferenced managed filename", async () => {
    state.storedLogoPath = "/api/uploads/123e4567-e89b-42d3-a456-426614174999.png";
    const response = await GET(new Request(`http://localhost:3000${logoPath}`), {
      params: Promise.resolve({ filename }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.readUpload).not.toHaveBeenCalled();
  });
});
