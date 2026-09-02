import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password is required"),
});

export const productSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().min(10).max(500),
  priceCents: z.number().int().min(100, "Price must be at least $1"),
  filePath: z
    .string()
    .regex(
      /^\/files\/[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/,
      "Choose a PDF from the managed local file library",
    ),
});

export const checkoutSchema = z.object({
  productId: z.string().cuid(),
  buyerName: z.string().min(2).max(80),
  buyerEmail: z.string().email().transform((value) => value.toLowerCase()),
  couponCode: z
    .string()
    .trim()
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/, "Coupon contains unsupported characters")
    .optional()
    .or(z.literal("")),
  campaignId: z.string().cuid().nullable().optional(),
  sessionId: z.string().min(8).max(100).nullable().optional(),
});

export const scriptSchema = z.object({
  name: z.string().min(2).max(80),
  body: z.string().min(20).max(600),
  category: z.enum(["pitch", "qualify", "objections", "checkout", "delivery"]),
});

export const campaignSchema = z.object({
  name: z.string().min(2).max(80),
  keyword: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Keyword should be uppercase letters or numbers"),
  platform: z.enum(["instagram", "tiktok", "generic"]),
  startsOn: z.string().or(z.date()),
  endsOn: z.string().or(z.date()),
});

export const messageSchema = z.object({
  sessionId: z.string().min(8).max(100),
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(600),
  campaignId: z.string().cuid().nullable().optional(),
  productId: z.string().cuid().nullable().optional(),
});

export const settingSchema = z.object({
  brandName: z.string().min(2).max(80),
  primaryHex: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex value"),
  logoPath: z
    .string()
    .regex(
      /^\/api\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/,
      "Logo path must reference a managed local upload",
    )
    .nullable()
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ScriptInput = z.infer<typeof scriptSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type SettingInput = z.infer<typeof settingSchema>;
