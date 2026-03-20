import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ValidationError } from "../utils/errors.js";

// Inline the quiz file schema here to avoid cross-package import issues at runtime.
// This mirrors shared/quiz-file.schema.ts — keep in sync.

const optionSchema = z.object({
  text: z.string().min(1, "Option text is required"),
  is_true: z.boolean(),
  explanation: z.string().min(1, "Explanation is required"),
});

const optionKeyPattern = /^[a-z]$/;

const questionSchema = z
  .object({
    question_id: z.number().int().positive(),
    question_text: z.string().min(1, "Question text is required"),
    options: z.record(z.string(), optionSchema).refine(
      (opts) => {
        const keys = Object.keys(opts);
        return keys.length >= 2 && keys.every((k) => optionKeyPattern.test(k));
      },
      {
        message:
          "Options must have at least 2 entries with single lowercase letter keys",
      },
    ),
    correct_answer: z.union([z.string(), z.array(z.string())]),
    question_type: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const optionKeys = Object.keys(q.options);
    const correctKeys = Array.isArray(q.correct_answer)
      ? q.correct_answer
      : [q.correct_answer];

    for (const key of correctKeys) {
      if (!optionKeys.includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correct_answer references key "${key}" which does not exist in options`,
          path: ["correct_answer"],
        });
      }
    }

    for (const [key, opt] of Object.entries(q.options)) {
      const shouldBeTrue = correctKeys.includes(key);
      if (opt.is_true !== shouldBeTrue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Option "${key}" has is_true=${opt.is_true} but correct_answer says it should be ${shouldBeTrue}`,
          path: ["options", key, "is_true"],
        });
      }
    }

    if (
      q.question_type === "multiple_select" &&
      !Array.isArray(q.correct_answer)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'question_type is "multiple_select" but correct_answer is not an array',
        path: ["correct_answer"],
      });
    }
  });

const quizFileSchema = z
  .array(questionSchema)
  .min(1, "Quiz must have at least one question")
  .refine(
    (questions) => {
      const ids = questions.map((q) => q.question_id);
      return new Set(ids).size === ids.length;
    },
    { message: "Duplicate question_id values found" },
  );

function inferQuestionType(q: {
  correct_answer: string | string[];
  question_type?: string;
}): "single_select" | "multiple_select" {
  if (q.question_type === "multiple_select") return "multiple_select";
  if (Array.isArray(q.correct_answer)) return "multiple_select";
  return "single_select";
}

export class QuizImportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Parse and validate a quiz JSON string, then create a Quiz with questions.
   */
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
        sourceJson: parsed as any,
        questions: {
          create: questions.map((q, index) => ({
            questionId: q.question_id,
            questionText: q.question_text,
            questionType: inferQuestionType(q),
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

  /**
   * Export a quiz back to the original JSON file format.
   */
  async exportToJson(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    if (!quiz) throw new ValidationError("Quiz not found");
    if (quiz.userId !== userId) throw new ValidationError("Access denied");

    // If we have the original source JSON, return it for exact round-trip
    if (quiz.sourceJson) {
      return { json: quiz.sourceJson, title: quiz.title };
    }

    // Otherwise reconstruct from normalized data
    const exported = quiz.questions.map((q) => ({
      question_id: q.questionId,
      question_text: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer,
      ...(q.questionType === "multiple_select"
        ? { question_type: "multiple_select" }
        : {}),
    }));

    return { json: exported, title: quiz.title };
  }
}
