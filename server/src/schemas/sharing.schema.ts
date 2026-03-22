import { z } from "zod";

export const createShareSchema = z.object({
  email: z.string().email(),
  accessLevel: z.enum(["TAKER", "VIEWER"]).default("TAKER"),
});

export const updateShareSchema = z.object({
  status: z.enum(["REVOKED"]).optional(),
  accessLevel: z.enum(["TAKER", "VIEWER"]).optional(),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
