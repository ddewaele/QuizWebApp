import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/require-auth.js";
import { AttemptService } from "../services/attempt.service.js";
import { submitAttemptSchema } from "../schemas/attempt.schema.js";
import { ValidationError } from "../utils/errors.js";

export default async function attemptRoutes(fastify: FastifyInstance) {
  const attemptService = new AttemptService(fastify.prisma);

  fastify.addHook("onRequest", requireAuth);

  // Submit a quiz attempt
  fastify.post<{ Params: { id: string } }>(
    "/api/quizzes/:id/attempts",
    async (request, reply) => {
      const parsed = submitAttemptSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid attempt data", parsed.error.flatten());
      }
      const attempt = await attemptService.submit(
        request.params.id,
        request.userId!,
        parsed.data,
      );
      return reply.status(201).send({ attempt });
    },
  );

  // List user's attempts
  fastify.get("/api/attempts", async (request) => {
    const attempts = await attemptService.listByUser(request.userId!);
    return { attempts };
  });

  // Get attempt detail
  fastify.get<{ Params: { id: string } }>(
    "/api/attempts/:id",
    async (request) => {
      const attempt = await attemptService.getById(
        request.params.id,
        request.userId!,
      );
      return { attempt };
    },
  );
}
