import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDemoData, runDemoSeed } from "@/lib/demo-reset";
import {
  ensureManagedLogoUploadDirectory,
  resolveManagedLogoUpload,
} from "@/lib/security/managed-uploads";

const logoPath = "/api/uploads/123e4567-e89b-42d3-a456-426614174000.png";
const logoBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

let temporaryRoot = "";
let prisma: PrismaClient;

// This suite shells out to the prisma CLI (`prisma.cmd` on Windows) via
// execFileSync, which Node refuses to spawn on Windows without a shell. It runs
// on POSIX CI; the guard keeps `npm test` green on Windows. (afterAll already
// tolerates the un-initialised state via optional chaining.)
const isWindows = process.platform === "win32";

beforeAll(async () => {
  if (isWindows) return;
  temporaryRoot = await fs.mkdtemp(path.join(tmpdir(), "dm-commerce-reset-"));
  const databasePath = path.join(temporaryRoot, "reset.db").replace(/\\/g, "/");
  const prismaExecutable = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma",
  );
  execFileSync(prismaExecutable, ["migrate", "deploy"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CHECKPOINT_DISABLE: "1",
      DATABASE_URL: `file:${databasePath}`,
    },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasources: { db: { url: `file:${databasePath}` } } });
  await runDemoSeed(prisma);
}, 30_000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (temporaryRoot) await fs.rm(temporaryRoot, { recursive: true, force: true });
});

describe.skipIf(isWindows)("deterministic demo reset", () => {
  it("removes extra catalog data, restores golden counts, and safely removes the managed logo", async () => {
    await prisma.product.create({
      data: {
        title: "Extra product",
        description: "An extra product that the deterministic reset must remove.",
        priceCents: 1234,
        filePath: "/files/creator-guide.pdf",
      },
    });
    await prisma.script.create({
      data: {
        name: "Extra script",
        category: "pitch",
        body: "An extra script that the deterministic reset must remove completely.",
      },
    });
    await prisma.setting.update({ where: { id: 1 }, data: { logoPath } });
    await ensureManagedLogoUploadDirectory(temporaryRoot);
    const absoluteLogoPath = resolveManagedLogoUpload(logoPath, temporaryRoot);
    expect(absoluteLogoPath).not.toBeNull();
    await fs.writeFile(absoluteLogoPath!, logoBytes, { mode: 0o600 });

    const result = await resetDemoData(prisma, { projectRoot: temporaryRoot });
    const [products, scripts, campaigns, coupons, customers, orders, settings] =
      await Promise.all([
        prisma.product.findMany(),
        prisma.script.findMany(),
        prisma.campaign.findMany(),
        prisma.coupon.findMany(),
        prisma.customer.findMany(),
        prisma.order.findMany(),
        prisma.setting.findMany(),
      ]);

    expect(result).toEqual({ managedLogoRemoved: true, managedLogoCleanupFailed: false });
    expect(products).toHaveLength(2);
    expect(scripts).toHaveLength(6);
    expect(campaigns).toHaveLength(2);
    expect(coupons).toHaveLength(1);
    expect(customers).toHaveLength(6);
    expect(orders).toHaveLength(6);
    expect(settings).toEqual([
      expect.objectContaining({
        id: 1,
        brandName: "DM Commerce OS",
        primaryHex: "#6366F1",
        logoPath: null,
      }),
    ]);
    await expect(fs.stat(absoluteLogoPath!)).rejects.toMatchObject({ code: "ENOENT" });
  }, 30_000);
});
