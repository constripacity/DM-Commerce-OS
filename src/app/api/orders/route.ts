import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: true },
  });

  return NextResponse.json(orders);
}
