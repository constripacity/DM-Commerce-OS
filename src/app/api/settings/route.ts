import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { settingSchema } from "@/lib/validators";

const uploadDir = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = settingSchema.safeParse({
      brandName: body.brandName,
      primaryHex: body.primaryHex,
      logoPath: body.logoPath ?? null,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.setting.update({
      where: { id: 1 },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const brandName = formData.get("brandName");
  const primaryHex = formData.get("primaryHex");
  const logoPathField = formData.get("logoPath");
  const removeLogo = formData.get("removeLogo");
  const logoFile = formData.get("logoFile");

  let logoPath: string | null = typeof logoPathField === "string" && logoPathField.trim() ? logoPathField.trim() : null;

  if (removeLogo === "true") {
    logoPath = null;
  }

  if (logoFile instanceof File && logoFile.size > 0) {
    const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (logoFile.size > MAX_LOGO_SIZE) {
      return Response.json({ error: "File too large. Maximum 2MB." }, { status: 400 });
    }
    if (!ALLOWED_LOGO_TYPES.includes(logoFile.type)) {
      return Response.json({ error: "Invalid file type. Use PNG, JPG, WebP, or SVG." }, { status: 400 });
    }
    await ensureUploadDir();
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    const sanitizedName = logoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${Date.now()}-${sanitizedName}`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    logoPath = `/uploads/${filename}`;
  }

  const parsed = settingSchema.safeParse({
    brandName: typeof brandName === "string" ? brandName : "",
    primaryHex: typeof primaryHex === "string" ? primaryHex : "",
    logoPath,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.setting.update({
    where: { id: 1 },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
