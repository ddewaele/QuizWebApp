import type { PrismaClient } from "@prisma/client";
import { quizFileSchema } from "../../../shared/quiz-file.schema.js";
import { ValidationError } from "../utils/errors.js";

export class QuizImportService {
  constructor(private prisma: PrismaClient) {}

  async importFromJson(userId: string, title: string, jsonString: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new ValidationError("Invalid JSON format");
    }

    const result = quizFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError("Quiz file validation failed", {
        errors: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const questions = result.data;

    return this.prisma.quiz.create({
      data: {
        title,
        userId,
        sourceJson: parsed as object,
        questions: {
          create: questions.map((q, index) => ({
            questionId: q.question_id,
            questionText: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            sortOrder: index,
          })),
        },
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async exportToJson(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    if (!quiz) throw new ValidationError("Quiz not found");
    if (quiz.userId !== userId) throw new ValidationError("Access denied");

    if (quiz.sourceJson) {
      return { json: quiz.sourceJson, title: quiz.title };
    }

    const exported = quiz.questions.map((q) => ({
      question_id: q.questionId,
      question_text: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer,
    }));

    return { json: exported, title: quiz.title };
  }
}
