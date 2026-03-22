import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/require-auth.js";
import { QuizService } from "../services/quiz.service.js";
import { QuizImportService } from "../services/quiz-import.service.js";
import { createQuizSchema, updateQuizSchema, generateQuizSchema, suggestChipsSchema } from "../schemas/quiz.schema.js";
import { QuizGenerationService } from "../services/quiz-generation.service.js";
import { ValidationError } from "../utils/errors.js";

export default async function quizRoutes(fastify: FastifyInstance) {
  const quizService = new QuizService(fastify.prisma);
  const importService = new QuizImportService(fastify.prisma);
  const generationService = new QuizGenerationService();

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

  // Suggest prompt chips for AI quiz generation
  fastify.post("/api/quizzes/suggest-chips", async (request, reply) => {
    const parsed = suggestChipsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid suggest-chips request", parsed.error.flatten());
    }
    const chips = await generationService.suggestChips(parsed.data);
    return reply.send({ chips });
  });

  // Generate quiz questions with AI (SSE stream)
  fastify.post("/api/quizzes/generate", async (request, reply) => {
    const parsed = generateQuizSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid generate request", parsed.error.flatten());
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const event of generationService.generateStream(parsed.data)) {
        send(event);
      }
    } catch (err) {
      send({ type: "error", message: err instanceof Error ? err.message : "Generation failed" });
    }

    reply.raw.end();
  });

  // Import quiz from JSON
  fastify.post("/api/quizzes/import", async (request, reply) => {
    const { content } = request.body as { content?: string };

    if (!content) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "content field is required (JSON string)",
      });
    }

    try {
      const quiz = await importService.importFromJson(request.userId!, content);
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
