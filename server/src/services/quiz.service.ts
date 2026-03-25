import type { PrismaClient, Prisma } from "@prisma/client";
import type { CreateQuizInput, UpdateQuizInput } from "../schemas/quiz.schema.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

export class QuizService {
  constructor(private prisma: PrismaClient) {}

  /** Fetch a quiz and verify ownership. Throws NotFoundError or ForbiddenError. */
  private async findOwnedQuiz(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.userId !== userId) throw new ForbiddenError();
    return quiz;
  }

  async listByUser(userId: string) {
    return this.prisma.quiz.findMany({
      where: { userId },
      include: {
        _count: { select: { questions: true, attempts: true } },
        attempts: {
          where: { userId },
          orderBy: { completedAt: "desc" },
          take: 8,
          select: { percentage: true, completedAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getById(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    if (!quiz) throw new NotFoundError("Quiz");

    // Owner can always access
    if (quiz.userId === userId) return quiz;

    // Check shared access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user) {
      const share = await this.prisma.quizShare.findFirst({
        where: {
          quizId: id,
          email: { equals: user.email, mode: "insensitive" },
          status: "ACCEPTED",
        },
      });
      if (share) return quiz;
    }

    throw new ForbiddenError();
  }

  async create(userId: string, input: CreateQuizInput) {
    return this.prisma.quiz.create({
      data: {
        title: input.title,
        description: input.description,
        userId,
        questions: {
          create: input.questions.map((q, index) => ({
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
            sortOrder: index,
          })),
        },
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async update(id: string, userId: string, input: UpdateQuizInput) {
    await this.findOwnedQuiz(id, userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
        },
      });

      if (input.questions) {
        await tx.quizQuestion.deleteMany({ where: { quizId: id } });
        await tx.quizQuestion.createMany({
          data: input.questions.map((q, index) => ({
            quizId: id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
            sortOrder: index,
          })),
        });
      }

      return tx.quiz.findUnique({
        where: { id },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      });
    });
  }

  async delete(id: string, userId: string) {
    await this.findOwnedQuiz(id, userId);
    await this.prisma.quiz.delete({ where: { id } });
  }
}
