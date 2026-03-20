import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import { AppError } from "./utils/errors.js";
import type { Env } from "./config.js";

export async function buildApp(config: Env) {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: config.NODE_ENV === "production" ? false : config.CLIENT_URL,
    credentials: true,
  });

  // Database
  await fastify.register(prismaPlugin);

  // Auth (sessions + Google OAuth)
  await fastify.register(authPlugin, { config });

  // Routes
  await fastify.register(authRoutes, { config });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        ...("details" in error ? { details: (error as any).details } : {}),
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Request validation failed",
        details: error.validation,
      });
    }

    fastify.log.error(error);
    return reply.status(500).send({
      error: "InternalServerError",
      message:
        config.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  });

  // Health check
  fastify.get("/api/health", async () => ({ status: "ok" }));

  return fastify;
}
