export interface CouponLike {
  code: string;
  kind: string;
  amount: number;
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface PriceBreakdown {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
}

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export function normalizeCouponCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase();
  return code || null;
}

export function priceWithCoupon(
  subtotalCents: number,
  coupon: CouponLike | null,
  now = new Date(),
): PriceBreakdown {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new CouponError("Invalid product price");
  }

  if (!coupon) {
    return {
      subtotalCents,
      discountCents: 0,
      totalCents: subtotalCents,
      couponCode: null,
    };
  }

  if (!coupon.active) throw new CouponError("Coupon is inactive");
  if (coupon.startsAt && coupon.startsAt > now) {
    throw new CouponError("Coupon is not active yet");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new CouponError("Coupon has expired");
  }
  if (
    coupon.maxRedemptions !== null &&
    coupon.redemptionCount >= coupon.maxRedemptions
  ) {
    throw new CouponError("Coupon redemption limit reached");
  }

  let discountCents: number;
  if (coupon.kind === "percent") {
    if (coupon.amount < 1 || coupon.amount > 100) {
      throw new CouponError("Invalid percentage coupon configuration");
    }
    discountCents = Math.round((subtotalCents * coupon.amount) / 100);
  } else if (coupon.kind === "fixed") {
    if (!Number.isSafeInteger(coupon.amount) || coupon.amount < 1) {
      throw new CouponError("Invalid fixed coupon configuration");
    }
    discountCents = coupon.amount;
  } else {
    throw new CouponError("Unknown coupon type");
  }

  discountCents = Math.min(discountCents, subtotalCents);
  return {
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    couponCode: coupon.code,
  };
}
