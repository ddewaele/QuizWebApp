import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/require-auth.js";
import { QuizService } from "../services/quiz.service.js";
import { QuizImportService } from "../services/quiz-import.service.js";
import { createQuizSchema, updateQuizSchema } from "../schemas/quiz.schema.js";
import { ValidationError } from "../utils/errors.js";

export default async function quizRoutes(fastify: FastifyInstance) {
  const quizService = new QuizService(fastify.prisma);
  const importService = new QuizImportService(fastify.prisma);

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

  // Import quiz from JSON
  fastify.post("/api/quizzes/import", async (request, reply) => {
    const { title, content } = request.body as {
      title?: string;
      content?: string;
    };

    if (!content) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "content field is required (JSON string)",
      });
    }

    try {
      const quiz = await importService.importFromJson(
        request.userId!,
        title || "Imported Quiz",
        content,
      );
      return reply.status(201).send({ quiz });
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.status(400).send({
          error: "ValidationError",
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        });
      }
      throw err;
    }
  });

  // Export quiz as JSON
  fastify.get<{ Params: { id: string } }>(
    "/api/quizzes/:id/export",
    async (request, reply) => {
      const { json, title } = await importService.exportToJson(
        request.params.id,
        request.userId!,
      );

      const filename = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim()}.json`;

      return reply
        .header("Content-Type", "application/json")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(json);
    },
  );
}
