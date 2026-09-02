import { describe, expect, it } from "vitest";
import { priceWithCoupon, type CouponLike } from "@/lib/commerce/coupons";

const coupon: CouponLike = {
  code: "LAUNCH20",
  kind: "percent",
  amount: 20,
  active: true,
  maxRedemptions: 100,
  redemptionCount: 2,
  startsAt: null,
  endsAt: null,
};

describe("coupon pricing", () => {
  it("calculates integer-cents percentage discounts", () => {
    expect(priceWithCoupon(2900, coupon)).toEqual({
      subtotalCents: 2900,
      discountCents: 580,
      totalCents: 2320,
      couponCode: "LAUNCH20",
    });
  });

  it("caps fixed discounts so totals never become negative", () => {
    expect(
      priceWithCoupon(500, { ...coupon, code: "BIG", kind: "fixed", amount: 900 }),
    ).toMatchObject({ discountCents: 500, totalCents: 0 });
  });

  it("rejects expired and exhausted coupons with actionable errors", () => {
    expect(() =>
      priceWithCoupon(2900, { ...coupon, endsAt: new Date("2020-01-01") }),
    ).toThrow("expired");
    expect(() =>
      priceWithCoupon(2900, { ...coupon, maxRedemptions: 2, redemptionCount: 2 }),
    ).toThrow("limit");
  });
});
