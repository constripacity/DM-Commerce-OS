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
    .startsWith("/files/", { message: "File path must begin with /files/" })
    .regex(/\.pdf$/, "File must be a PDF"),
});

export const checkoutSchema = z.object({
  productId: z.string().cuid(),
  buyerName: z.string().min(2).max(80),
  buyerEmail: z.string().email(),
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
  sessionId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(600),
});

export const settingSchema = z.object({
  brandName: z.string().min(2).max(80),
  primaryHex: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex value"),
  logoPath: z.string().min(2).max(120).nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ScriptInput = z.infer<typeof scriptSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type SettingInput = z.infer<typeof settingSchema>;
