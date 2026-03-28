import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth.js";
import { ChatService } from "../services/chat.service.js";

const chatRequestSchema = z.object({
  context: z.object({
    questionText: z.string().min(1),
    options: z.record(
      z.object({
        text: z.string(),
        is_true: z.boolean(),
        explanation: z.string(),
      }),
    ),
    correctAnswer: z.array(z.string()),
  }),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
});

export default async function chatRoutes(fastify: FastifyInstance) {
  const chatService = new ChatService();

  fastify.addHook("onRequest", requireAuth);

  // Generate suggested follow-up questions
  fastify.post("/api/chat/suggestions", async (request, reply) => {
    const contextSchema = chatRequestSchema.shape.context;
    const parsed = contextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "ValidationError", message: "Invalid context" });
    }
    const suggestions = await chatService.suggestQuestions(parsed.data);
    return reply.send({ suggestions });
  });

  // Stream a chat reply for a question context
  fastify.post("/api/chat/question", async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Invalid chat request",
        details: parsed.error.flatten(),
      });
    }

    const { context, messages } = parsed.data;

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      for await (const chunk of chatService.streamReply(context, messages)) {
        reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      reply.raw.write(
        `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Chat failed" })}\n\n`,
      );
    }

    reply.raw.end();
  });
}
