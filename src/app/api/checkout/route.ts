import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkoutSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const order = await prisma.order.create({
    data: parsed.data,
    include: { product: true },
  });

  return NextResponse.json(order, { status: 201 });
}
