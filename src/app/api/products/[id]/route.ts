import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { requireAuthCookie } from "@/lib/auth";
import { isTrustedMutationRequest } from "@/lib/security/request";
import { databaseMutationError } from "@/lib/api/database-errors";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = productSchema.safeParse({
    ...payload,
    priceCents: Number(payload.priceCents),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  try {
    const product = await prisma.product.update({ where: { id }, data: parsed.data });
    return NextResponse.json(product);
  } catch (error) {
    return databaseMutationError(error, "Product");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const { id } = await params;
  const orderCount = await prisma.order.count({ where: { productId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a product with existing orders" },
      { status: 400 }
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return databaseMutationError(error, "Product");
  }
}
