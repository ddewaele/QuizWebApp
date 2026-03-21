import { z } from "zod";

/**
 * Zod schemas for the quiz JSON import/export format.
 *
 * correct_answer is always a string[] — single-select questions have one element,
 * multiple-select questions have two or more. question_type is not part of the format;
 * it is derived from correct_answer.length.
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
    correct_answer: z.array(z.string()).min(1, "At least one correct answer is required"),
  })
  .superRefine((q, ctx) => {
    const optionKeys = Object.keys(q.options);

    for (const key of q.correct_answer) {
      if (!optionKeys.includes(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correct_answer references key "${key}" which does not exist in options`,
          path: ["correct_answer"],
        });
      }
    }

    for (const [key, opt] of Object.entries(q.options)) {
      const shouldBeTrue = q.correct_answer.includes(key);
      if (opt.is_true !== shouldBeTrue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Option "${key}" has is_true=${opt.is_true} but correct_answer says it should be ${shouldBeTrue}`,
          path: ["options", key, "is_true"],
        });
      }
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
