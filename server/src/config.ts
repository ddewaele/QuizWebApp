import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // CLIENT_URL can be omitted on Railway — RAILWAY_PUBLIC_DOMAIN is used as fallback
  CLIENT_URL: z.string().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
});

export type Env = Omit<z.infer<typeof envSchema>, "CLIENT_URL" | "RAILWAY_PUBLIC_DOMAIN"> & {
  CLIENT_URL: string;
};

export function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  const data = result.data;

  // Resolve CLIENT_URL: explicit value wins, then Railway's injected domain, then local default
  const clientUrl =
    data.CLIENT_URL ??
    (data.RAILWAY_PUBLIC_DOMAIN ? `https://${data.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:5174");

  return { ...data, CLIENT_URL: clientUrl };
}
