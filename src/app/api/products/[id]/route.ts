import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validators";
import { requireAuthCookie } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const product = await prisma.product.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(product);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderCount = await prisma.order.count({ where: { productId: params.id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a product with existing orders" },
      { status: 400 }
    );
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
