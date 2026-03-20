import type { PrismaClient } from "@prisma/client";
import type { CreateQuizInput, UpdateQuizInput } from "../schemas/quiz.schema.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

export class QuizService {
  constructor(private prisma: PrismaClient) {}

  async listByUser(userId: string) {
    return this.prisma.quiz.findMany({
      where: { userId },
      include: { _count: { select: { questions: true, attempts: true } } },
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
    if (quiz.userId !== userId) throw new ForbiddenError();

    return quiz;
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
            questionType: q.questionType,
            options: q.options,
            correctAnswer: q.correctAnswer,
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
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.userId !== userId) throw new ForbiddenError();

    return this.prisma.$transaction(async (tx) => {
      // Update quiz metadata
      const updated = await tx.quiz.update({
        where: { id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
        },
      });

      // Replace questions if provided
      if (input.questions) {
        await tx.quizQuestion.deleteMany({ where: { quizId: id } });
        await tx.quizQuestion.createMany({
          data: input.questions.map((q, index) => ({
            quizId: id,
            questionId: q.questionId,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options as any,
            correctAnswer: q.correctAnswer as any,
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
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.userId !== userId) throw new ForbiddenError();

    await this.prisma.quiz.delete({ where: { id } });
  }
}
