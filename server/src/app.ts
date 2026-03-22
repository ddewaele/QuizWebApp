import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "path";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quizzes.js";
import attemptRoutes from "./routes/attempts.js";
import sharingRoutes from "./routes/sharing.js";
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
  await fastify.register(quizRoutes);
  await fastify.register(attemptRoutes);
  await fastify.register(sharingRoutes, { config });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError & { details?: unknown }, _request, reply) => {
    // AppError / ValidationError — has a numeric statusCode set by us
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      });
    }

    // Fastify schema validation errors
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

  // In production, serve the built React SPA and handle client-side routing
  if (config.NODE_ENV === "production") {
    const clientDist = path.join(process.cwd(), "../client/dist");

    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: "/",
      wildcard: false,
    });

    // SPA fallback — any non-API route serves index.html so React Router works
    fastify.setNotFoundHandler((_request, reply) => {
      if (_request.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "Not Found", message: "Route not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return fastify;
}
