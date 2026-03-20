import { z } from "zod";

/**
 * Zod schemas for the quiz JSON import/export format.
 * This is the canonical definition of the file format the app accepts.
 */

export const optionSchema = z.object({
  text: z.string().min(1, "Option text is required"),
  is_true: z.boolean(),
  explanation: z.string().min(1, "Explanation is required"),
});

export type QuizFileOption = z.infer<typeof optionSchema>;

const optionKeyPattern = /^[a-z]$/;

export const questionSchema = z
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
          "Options must have at least 2 entries with single lowercase letter keys (a, b, c, ...)",
      }
    ),
    correct_answer: z.union([z.string(), z.array(z.string())]),
    question_type: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const optionKeys = Object.keys(q.options);

    // Normalize correct_answer to array
    const correctKeys = Array.isArray(q.correct_answer)
      ? q.correct_answer
      : [q.correct_answer];

    // Validate correct_answer references existing option keys
    for (const key of correctKeys) {
      if (!optionKeys.includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correct_answer references key "${key}" which does not exist in options`,
          path: ["correct_answer"],
        });
      }
    }

    // Note: is_true mismatches with correct_answer are tolerated during import.
    // correct_answer is the source of truth; is_true is auto-fixed on import.

    // Validate question_type consistency
    const isMultiSelect =
      Array.isArray(q.correct_answer) || q.question_type === "multiple_select";
    if (q.question_type === "multiple_select" && !Array.isArray(q.correct_answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'question_type is "multiple_select" but correct_answer is not an array',
        path: ["correct_answer"],
      });
    }
    if (Array.isArray(q.correct_answer) && q.correct_answer.length < 2 && isMultiSelect) {
      // An array with 1 element is technically valid but unusual — allow it
    }
  });

export type QuizFileQuestion = z.infer<typeof questionSchema>;

export const quizFileSchema = z
  .array(questionSchema)
  .min(1, "Quiz must have at least one question")
  .refine(
    (questions) => {
      const ids = questions.map((q) => q.question_id);
      return new Set(ids).size === ids.length;
    },
    { message: "Duplicate question_id values found" }
  );

export type QuizFile = z.infer<typeof quizFileSchema>;

/** Infer the question type from a question object */
export function inferQuestionType(
  q: Pick<QuizFileQuestion, "correct_answer" | "question_type">
): "single_select" | "multiple_select" {
  if (q.question_type === "multiple_select") return "multiple_select";
  if (Array.isArray(q.correct_answer)) return "multiple_select";
  return "single_select";
}
