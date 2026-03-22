import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/require-auth.js";
import { QuizSharingService } from "../services/quiz-sharing.service.js";
import { createShareSchema, updateShareSchema } from "../schemas/sharing.schema.js";
import { ValidationError } from "../utils/errors.js";

export default async function sharingRoutes(fastify: FastifyInstance) {
  const sharingService = new QuizSharingService(fastify.prisma);

  fastify.addHook("onRequest", requireAuth);

  // Share a quiz with an email
  fastify.post<{ Params: { id: string } }>(
    "/api/quizzes/:id/shares",
    async (request, reply) => {
      const parsed = createShareSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid share data", parsed.error.flatten());
      }
      const share = await sharingService.share(
        request.params.id,
        request.userId!,
        parsed.data,
      );
      return reply.status(201).send({ share });
    },
  );

  // List shares for a quiz (owner only)
  fastify.get<{ Params: { id: string } }>(
    "/api/quizzes/:id/shares",
    async (request) => {
      const shares = await sharingService.listShares(
        request.params.id,
        request.userId!,
      );
      return { shares };
    },
  );

  // Update a share (revoke, change access level)
  fastify.patch<{ Params: { id: string; shareId: string } }>(
    "/api/quizzes/:id/shares/:shareId",
    async (request) => {
      const parsed = updateShareSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid update data", parsed.error.flatten());
      }
      const share = await sharingService.updateShare(
        request.params.shareId,
        request.params.id,
        request.userId!,
        parsed.data,
      );
      return { share };
    },
  );

  // Delete a share
  fastify.delete<{ Params: { id: string; shareId: string } }>(
    "/api/quizzes/:id/shares/:shareId",
    async (request, reply) => {
      await sharingService.deleteShare(
        request.params.shareId,
        request.params.id,
        request.userId!,
      );
      return reply.status(204).send();
    },
  );

  // Accept a share invitation via token
  fastify.post<{ Querystring: { token: string } }>(
    "/api/shares/accept",
    async (request) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.userId! },
        select: { email: true },
      });

      if (!user) throw new ValidationError("User not found");

      const share = await sharingService.acceptByToken(
        request.query.token,
        user.email,
      );
      return { share, quizId: share.quizId };
    },
  );

  // List quizzes shared with the current user
  fastify.get("/api/shared", async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId! },
      select: { email: true },
    });

    if (!user) throw new ValidationError("User not found");

    const sharedQuizzes = await sharingService.listSharedWithUser(user.email);
    return { sharedQuizzes };
  });
}
