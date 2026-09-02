import type { PrismaClient } from "@prisma/client";
import { priceWithCoupon, normalizeCouponCode, CouponError } from "./coupons";
import type { DeliveryProvider, PaymentProvider } from "./providers";
import { commerceEventTypes, encodeEventProperties } from "@/lib/events";

export interface LocalCheckoutInput {
  productId: string;
  buyerName: string;
  buyerEmail: string;
  couponCode?: string | null;
  campaignId?: string | null;
  sessionId?: string | null;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export async function createLocalCheckout(
  prisma: PrismaClient,
  input: LocalCheckoutInput,
  providers: { payment: PaymentProvider; delivery: DeliveryProvider },
) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new CheckoutError("Product not found", 404);

  const campaign = input.campaignId
    ? await prisma.campaign.findUnique({ where: { id: input.campaignId } })
    : null;
  if (input.campaignId && !campaign) {
    throw new CheckoutError("Campaign attribution is invalid");
  }

  const normalizedCode = normalizeCouponCode(input.couponCode);
  const coupon = normalizedCode
    ? await prisma.coupon.findUnique({ where: { code: normalizedCode } })
    : null;
  if (normalizedCode && !coupon) throw new CheckoutError("Coupon not found");

  let price;
  try {
    price = priceWithCoupon(product.priceCents, coupon);
  } catch (error) {
    if (error instanceof CouponError) throw new CheckoutError(error.message);
    throw error;
  }

  const [payment, delivery] = await Promise.all([
    providers.payment.authorize({
      amountCents: price.totalCents,
      currency: "USD",
      customerEmail: input.buyerEmail,
    }),
    providers.delivery.deliver({
      filePath: product.filePath,
      customerEmail: input.buyerEmail,
    }),
  ]);

  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const customer = await transaction.customer.upsert({
      where: { email: input.buyerEmail.toLowerCase() },
      update: { name: input.buyerName },
      create: {
        email: input.buyerEmail.toLowerCase(),
        name: input.buyerName,
      },
    });

    if (coupon) {
      const updated = await transaction.coupon.updateMany({
        where: {
          id: coupon.id,
          active: true,
          redemptionCount: coupon.redemptionCount,
        },
        data: { redemptionCount: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new CheckoutError("Coupon changed while checkout was running. Retry.", 409);
      }
    }

    const order = await transaction.order.create({
      data: {
        productId: product.id,
        customerId: customer.id,
        campaignId: campaign?.id ?? null,
        sessionId: input.sessionId ?? null,
        status: "delivered",
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail.toLowerCase(),
        subtotalCents: price.subtotalCents,
        discountCents: price.discountCents,
        totalCents: price.totalCents,
        couponCode: price.couponCode,
        deliveredAt: now,
      },
      include: { product: true, campaign: true, customer: true },
    });

    const shared = {
      sessionId: input.sessionId ?? null,
      campaignId: campaign?.id ?? null,
      productId: product.id,
      orderId: order.id,
      createdAt: now,
    };
    await transaction.commerceEvent.createMany({
      data: [
        {
          ...shared,
          type: commerceEventTypes.checkoutStarted,
          propertiesJson: encodeEventProperties({
            provider: payment.provider,
            amountCents: price.totalCents,
            couponCode: price.couponCode,
          }),
        },
        {
          ...shared,
          type: commerceEventTypes.orderCompleted,
          propertiesJson: encodeEventProperties({
            paymentReference: payment.reference,
            totalCents: price.totalCents,
          }),
        },
        {
          ...shared,
          type: commerceEventTypes.deliveryCompleted,
          propertiesJson: encodeEventProperties({
            provider: delivery.provider,
            path: delivery.path,
          }),
        },
      ],
    });

    return order;
  });
}
