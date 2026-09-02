import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validators";
import { requireAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createLocalCheckout, CheckoutError } from "@/lib/commerce/checkout";
import { localCommerceProviders } from "@/lib/commerce/providers";
import { isTrustedMutationRequest } from "@/lib/security/request";

export async function POST(request: Request) {
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

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const order = await createLocalCheckout(
      prisma,
      parsed.data,
      localCommerceProviders,
    );
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Local checkout failed", error);
    return NextResponse.json({ error: "Checkout could not be completed" }, { status: 500 });
  }
}
