import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/require-auth.js";
import { QuizService } from "../services/quiz.service.js";
import { createQuizSchema, updateQuizSchema } from "../schemas/quiz.schema.js";
import { ValidationError } from "../utils/errors.js";

export default async function quizRoutes(fastify: FastifyInstance) {
  const quizService = new QuizService(fastify.prisma);

  fastify.addHook("onRequest", requireAuth);

  // List quizzes
  fastify.get("/api/quizzes", async (request) => {
    const quizzes = await quizService.listByUser(request.userId!);
    return { quizzes };
  });

  // Get quiz by ID
  fastify.get<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    async (request) => {
      const quiz = await quizService.getById(
        request.params.id,
        request.userId!,
      );
      return { quiz };
    },
  );

  // Create quiz
  fastify.post("/api/quizzes", async (request, reply) => {
    const parsed = createQuizSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid quiz data", parsed.error.flatten());
    }
    const quiz = await quizService.create(request.userId!, parsed.data);
    return reply.status(201).send({ quiz });
  });

  // Update quiz
  fastify.put<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    async (request) => {
      const parsed = updateQuizSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid quiz data", parsed.error.flatten());
      }
      const quiz = await quizService.update(
        request.params.id,
        request.userId!,
        parsed.data,
      );
      return { quiz };
    },
  );

  // Delete quiz
  fastify.delete<{ Params: { id: string } }>(
    "/api/quizzes/:id",
    async (request, reply) => {
      await quizService.delete(request.params.id, request.userId!);
      return reply.status(204).send();
    },
  );
}
