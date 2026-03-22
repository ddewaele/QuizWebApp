import type { PrismaClient, QuizQuestion } from "@prisma/client";
import type { SubmitAttemptInput } from "../schemas/attempt.schema.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../utils/errors.js";

export class AttemptService {
  constructor(private prisma: PrismaClient) {}

  async submit(quizId: string, userId: string, input: SubmitAttemptInput) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    if (!quiz) throw new NotFoundError("Quiz");

    // Allow owner or shared users to submit attempts
    if (quiz.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const hasAccess = user && await this.prisma.quizShare.findFirst({
        where: {
          quizId,
          email: { equals: user.email, mode: "insensitive" },
          status: "ACCEPTED",
        },
      });
      if (!hasAccess) throw new ForbiddenError();
    }

    const questions = quiz.questions;

    if (Object.keys(input.answers).length !== questions.length) {
      throw new ValidationError(
        `Expected ${questions.length} answers, got ${Object.keys(input.answers).length}`,
      );
    }

    // Score each answer
    let score = 0;
    const answerRecords: {
      questionId: string;
      selectedKeys: string[];
      isCorrect: boolean;
    }[] = [];

    for (const question of questions) {
      const selectedKeys = input.answers[question.id];
      if (!selectedKeys) {
        throw new ValidationError(
          `Missing answer for question ${question.questionId}`,
        );
      }

      const isCorrect = checkAnswer(question, selectedKeys);
      if (isCorrect) score++;

      answerRecords.push({
        questionId: question.id,
        selectedKeys,
        isCorrect,
      });
    }

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        score,
        totalQuestions,
        percentage: Math.round(percentage * 100) / 100,
        answers: {
          create: answerRecords.map((a) => ({
            questionId: a.questionId,
            selectedKeys: a.selectedKeys,
            isCorrect: a.isCorrect,
          })),
        },
      },
      include: {
        answers: {
          include: { question: true },
          orderBy: { question: { sortOrder: "asc" } },
        },
      },
    });
  }

  async listByUser(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: { select: { id: true, title: true } },
      },
      orderBy: { completedAt: "desc" },
    });
  }

  async getById(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { select: { id: true, title: true } },
        answers: {
          include: { question: true },
          orderBy: { question: { sortOrder: "asc" } },
        },
      },
    });

    if (!attempt) throw new NotFoundError("Attempt");
    if (attempt.userId !== userId) throw new ForbiddenError();

    return attempt;
  }
}

/** Check if selectedKeys match the correct answer exactly */
function checkAnswer(question: QuizQuestion, selectedKeys: string[]): boolean {
  const correctKeys = question.correctAnswer as string[];
  if (correctKeys.length !== selectedKeys.length) return false;
  const correctSet = new Set(correctKeys);
  return selectedKeys.every((key) => correctSet.has(key));
}
