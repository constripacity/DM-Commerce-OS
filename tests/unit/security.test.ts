import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createSignedSession, requireAuthCookie, verifySignedSession } from "@/lib/auth";
import { isTrustedMutationRequest } from "@/lib/security/request";
import {
  ensureManagedLogoUploadDirectory,
  readManagedLogoUpload,
  removeManagedLogoUpload,
  resolveManagedLogoUpload,
} from "@/lib/security/managed-uploads";
import { validateLogoUpload } from "@/lib/security/uploads";
import { productSchema } from "@/lib/validators";

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

beforeEach(() => {
  process.env.APP_SECRET = "test-secret-that-is-long-enough-for-signing";
});

describe("session and request boundaries", () => {
  it("accepts a signed unexpired session and rejects tampering", () => {
    const token = createSignedSession();
    expect(verifySignedSession(token)).toBe(true);
    const replacement = token.endsWith("0") ? "1" : "0";
    expect(verifySignedSession(`${token.slice(0, -1)}${replacement}`)).toBe(false);
  });

  it("rejects the public APP_SECRET placeholder even though it is long enough", () => {
    process.env.APP_SECRET = "CHANGE_ME_TO_A_LONG_RANDOM_STRING";
    expect(() => createSignedSession()).toThrow("must not use the public");
  });

  it("rejects browser mutations from another origin", () => {
    expect(
      isTrustedMutationRequest(
        new Request("http://localhost:3000/api/products", {
          method: "POST",
          headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toBe(false);
    expect(
      isTrustedMutationRequest(
        new Request("http://localhost:3000/api/products", {
          method: "POST",
          headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" },
        }),
      ),
    ).toBe(true);
  });

  it("treats malformed cookie encoding as unauthenticated", () => {
    const request = new Request("http://localhost:3000/api/orders", {
      headers: { cookie: "session=%E0%A4%A" },
    });
    expect(requireAuthCookie(request)).toBe(false);
  });
});

describe("logo upload validation", () => {
  it("uses file signatures rather than trusting the declared MIME type", () => {
    const fake = Buffer.from("<svg><script>alert(1)</script></svg>");
    expect(() => validateLogoUpload({ type: "image/png", size: fake.length }, fake)).toThrow(
      "valid PNG",
    );
  });

  it("accepts a correctly signed small PNG", () => {
    expect(validateLogoUpload({ type: "image/png", size: validPng.length }, validPng)).toEqual({
      extension: "png",
    });
  });

  it("rejects declared uploads above the two-megabyte limit before parsing content", () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(() =>
      validateLogoUpload({ type: "image/png", size: 2 * 1024 * 1024 + 1 }, bytes),
    ).toThrow("between 1 byte and 2 MB");
  });
});

describe("managed logo storage", () => {
  it.skipIf(process.platform === "win32")(
    "bounds reads and refuses traversal or linked files without touching their targets",
    async () => {
      const root = await fs.mkdtemp(path.join(tmpdir(), "dm-logo-storage-"));
      const logoPath = "/api/uploads/123e4567-e89b-42d3-a456-426614174000.png";
      const linkedPath = "/api/uploads/123e4567-e89b-42d3-a456-426614174001.png";
      const outsidePath = path.join(root, "outside.png");
      try {
        await ensureManagedLogoUploadDirectory(root);
        const absolutePath = resolveManagedLogoUpload(logoPath, root);
        const absoluteLinkedPath = resolveManagedLogoUpload(linkedPath, root);
        expect(absolutePath).not.toBeNull();
        expect(absoluteLinkedPath).not.toBeNull();
        await fs.writeFile(absolutePath!, validPng);
        expect((await readManagedLogoUpload(logoPath, root))?.bytes).toEqual(validPng);

        await fs.writeFile(absolutePath!, Buffer.alloc(2 * 1024 * 1024 + 1));
        expect(await readManagedLogoUpload(logoPath, root)).toBeNull();

        await fs.writeFile(outsidePath, validPng);
        await fs.symlink(outsidePath, absoluteLinkedPath!);
        expect(await readManagedLogoUpload(linkedPath, root)).toBeNull();
        expect(await removeManagedLogoUpload(linkedPath, root)).toBe(true);
        await expect(fs.stat(outsidePath)).resolves.toBeDefined();
        expect(
          resolveManagedLogoUpload("/api/uploads/../../outside.png", root),
        ).toBeNull();
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(process.platform === "win32")(
    "rejects a linked storage root before creating nested directories",
    async () => {
      const root = await fs.mkdtemp(path.join(tmpdir(), "dm-logo-root-"));
      const outside = await fs.mkdtemp(path.join(tmpdir(), "dm-logo-outside-"));
      try {
        await fs.symlink(outside, path.join(root, "var"));
        await expect(ensureManagedLogoUploadDirectory(root)).rejects.toThrow(
          "must not contain filesystem links",
        );
        await expect(fs.stat(path.join(outside, "uploads"))).rejects.toMatchObject({
          code: "ENOENT",
        });
      } finally {
        await fs.rm(root, { recursive: true, force: true });
        await fs.rm(outside, { recursive: true, force: true });
      }
    },
  );
});

describe("managed delivery paths", () => {
  it("rejects traversal and hidden file paths at catalog validation", () => {
    const product = {
      title: "Safe product",
      description: "A sufficiently detailed product description.",
      priceCents: 1000,
    };
    expect(productSchema.safeParse({ ...product, filePath: "/files/guide.pdf" }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, filePath: "/files/../secret.pdf" }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, filePath: "/files/.hidden.pdf" }).success).toBe(false);
  });
});
