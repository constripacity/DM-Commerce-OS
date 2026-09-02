import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { settingSchema } from "@/lib/validators";
import { isTrustedMutationRequest } from "@/lib/security/request";
import {
  ensureManagedLogoUploadDirectory,
  managedLogoRouteForFilename,
  managedLogoRoutePath,
  removeManagedLogoUpload,
  resolveManagedLogoUpload,
} from "@/lib/security/managed-uploads";
import {
  MAX_LOGO_SIZE,
  MAX_SETTINGS_FORM_SIZE,
  validateLogoUpload,
} from "@/lib/security/uploads";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return NextResponse.json(
    setting
      ? {
          ...setting,
          logoPath: setting.logoPath?.startsWith("/api/uploads/")
            ? managedLogoRoutePath(setting.logoPath)
            : null,
        }
      : setting,
  );
}

export async function PUT(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  const contentLengthHeader = request.headers.get("content-length");
  if (!contentLengthHeader || !/^\d+$/.test(contentLengthHeader)) {
    return NextResponse.json(
      { error: "Settings requests require a valid Content-Length" },
      { status: 411 },
    );
  }
  const contentLength = Number(contentLengthHeader);
  if (contentLength > MAX_SETTINGS_FORM_SIZE) {
    return NextResponse.json({ error: "Settings request is too large" }, { status: 413 });
  }

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

    const previous = await prisma.setting.findUnique({ where: { id: 1 } });
    const previousLogoPath = previous?.logoPath?.startsWith("/api/uploads/")
      ? managedLogoRoutePath(previous.logoPath)
      : null;
    if (parsed.data.logoPath && parsed.data.logoPath !== previousLogoPath) {
      return NextResponse.json(
        { error: "New logos must be uploaded as multipart form data" },
        { status: 400 },
      );
    }
    const updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: parsed.data,
      create: { id: 1, ...parsed.data },
    });
    if (
      previous?.logoPath &&
      (previous.logoPath.startsWith("/uploads/") || previousLogoPath !== updated.logoPath)
    ) {
      await removeManagedLogoUpload(previous.logoPath).catch(() => undefined);
    }

    return NextResponse.json(updated);
  }

  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
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
  const baseSettings = settingSchema
    .pick({ brandName: true, primaryHex: true })
    .safeParse({
      brandName: typeof brandName === "string" ? brandName : "",
      primaryHex: typeof primaryHex === "string" ? primaryHex : "",
    });
  if (!baseSettings.success) {
    return NextResponse.json({ error: baseSettings.error.flatten() }, { status: 400 });
  }

  const previous = await prisma.setting.findUnique({ where: { id: 1 } });
  const previousLogoPath = previous?.logoPath?.startsWith("/api/uploads/")
    ? managedLogoRoutePath(previous.logoPath)
    : null;
  let logoPath: string | null =
    typeof logoPathField === "string" && logoPathField.trim()
      ? logoPathField.trim()
      : null;
  let newlyWrittenFile: string | null = null;

  if (removeLogo === "true") {
    logoPath = null;
  }

  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_SIZE) {
      return Response.json({ error: "File too large. Maximum 2MB." }, { status: 400 });
    }
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    try {
      const validated = validateLogoUpload(logoFile, buffer);
      const filename = `${randomUUID()}.${validated.extension}`;
      const routePath = managedLogoRouteForFilename(filename);
      await ensureManagedLogoUploadDirectory();
      const filePath = routePath ? resolveManagedLogoUpload(routePath) : null;
      if (!filePath || !routePath) {
        throw new Error("Generated upload path escaped its storage directory");
      }
      await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o600 });
      newlyWrittenFile = filePath;
      logoPath = routePath;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid logo upload" },
        { status: 400 },
      );
    }
  }

  if (
    !newlyWrittenFile &&
    removeLogo !== "true" &&
    logoPath !== previousLogoPath
  ) {
    return NextResponse.json(
      { error: "A logo path can only be retained, removed, or replaced by an upload" },
      { status: 400 },
    );
  }

  const parsed = settingSchema.safeParse({
    brandName: typeof brandName === "string" ? brandName : "",
    primaryHex: typeof primaryHex === "string" ? primaryHex : "",
    logoPath,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: parsed.data,
      create: { id: 1, ...parsed.data },
    });
  } catch (error) {
    if (newlyWrittenFile) await fs.unlink(newlyWrittenFile).catch(() => undefined);
    console.error("Failed to persist brand settings", error);
    return NextResponse.json({ error: "Unable to save brand settings" }, { status: 500 });
  }
  if (
    previous?.logoPath &&
    (previous.logoPath.startsWith("/uploads/") || previousLogoPath !== updated.logoPath)
  ) {
    await removeManagedLogoUpload(previous.logoPath).catch(() => undefined);
  }

  return NextResponse.json(updated);
}
