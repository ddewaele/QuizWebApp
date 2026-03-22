import { Prisma, type PrismaClient } from "@prisma/client";
import { quizFileSchema } from "../../../shared/quiz-file.schema.js";
import { ValidationError } from "../utils/errors.js";

export interface BatchImportResult {
  fileName: string;
  success: boolean;
  quiz?: { id: string; title: string; _count: { questions: number } };
  error?: string;
  details?: unknown;
}

export class QuizImportService {
  constructor(private prisma: PrismaClient) {}

  async importBatch(
    userId: string,
    files: { content: string; fileName: string }[],
  ): Promise<BatchImportResult[]> {
    const results: BatchImportResult[] = [];

    for (const file of files) {
      try {
        const quiz = await this.importFromJson(userId, file.content);
        results.push({
          fileName: file.fileName,
          success: true,
          quiz: {
            id: quiz.id,
            title: quiz.title,
            _count: { questions: quiz.questions.length },
          },
        });
      } catch (err) {
        if (err instanceof ValidationError) {
          results.push({
            fileName: file.fileName,
            success: false,
            error: err.message,
            details: err.details,
          });
        } else {
          results.push({
            fileName: file.fileName,
            success: false,
            error: "Unexpected error importing quiz",
          });
        }
      }
    }

    return results;
  }

  async importFromJson(userId: string, jsonString: string) {
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

    const { meta, questions } = result.data;

    return this.prisma.quiz.create({
      data: {
        title: meta.title,
        subject: meta.subject ?? null,
        metaVersion: meta.version ?? null,
        metaCreated: meta.created ?? null,
        userId,
        sourceJson: parsed as object,
        questions: {
          create: questions.map((q, index) => ({
            questionId: q.question_id,
            questionText: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            sortOrder: index,
            difficulty: q.difficulty ?? null,
            topic: q.topic ?? null,
            tags: q.tags ?? Prisma.JsonNull,
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

    // Reconstruct the new format from stored data
    const exported = {
      meta: {
        title: quiz.title,
        ...(quiz.subject ? { subject: quiz.subject } : {}),
        ...(quiz.metaVersion ? { version: quiz.metaVersion } : {}),
        ...(quiz.metaCreated ? { created: quiz.metaCreated } : {}),
      },
      questions: quiz.questions.map((q) => ({
        question_id: q.questionId,
        question_text: q.questionText,
        options: q.options,
        correct_answer: q.correctAnswer,
        ...(q.difficulty ? { difficulty: q.difficulty } : {}),
        ...(q.topic ? { topic: q.topic } : {}),
        ...(q.tags ? { tags: q.tags } : {}),
      })),
    };

    return { json: exported, title: quiz.title };
  }
}
