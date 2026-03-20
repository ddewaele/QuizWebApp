import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the quiz file schema inline for unit testing
// (same as in quiz-import.service.ts)

const optionSchema = z.object({
  text: z.string().min(1),
  is_true: z.boolean(),
  explanation: z.string().min(1),
});

const optionKeyPattern = /^[a-z]$/;

const questionSchema = z
  .object({
    question_id: z.number().int().positive(),
    question_text: z.string().min(1),
    options: z.record(z.string(), optionSchema).refine(
      (opts) => {
        const keys = Object.keys(opts);
        return keys.length >= 2 && keys.every((k) => optionKeyPattern.test(k));
      },
      { message: "Options must have at least 2 entries with single lowercase letter keys" },
    ),
    correct_answer: z.union([z.string(), z.array(z.string())]),
    question_type: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const optionKeys = Object.keys(q.options);
    const correctKeys = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];

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

    if (q.question_type === "multiple_select" && !Array.isArray(q.correct_answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'question_type is "multiple_select" but correct_answer is not an array',
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

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    question_id: 1,
    question_text: "What is 2+2?",
    options: {
      a: { text: "3", is_true: false, explanation: "Wrong" },
      b: { text: "4", is_true: true, explanation: "Correct" },
    },
    correct_answer: "b",
    ...overrides,
  };
}

describe("Quiz file validation", () => {
  it("accepts a valid single-select question", () => {
    const result = quizFileSchema.safeParse([makeQuestion()]);
    expect(result.success).toBe(true);
  });

  it("accepts a valid multiple-select question", () => {
    const q = makeQuestion({
      question_id: 1,
      options: {
        a: { text: "A", is_true: true, explanation: "Yes" },
        b: { text: "B", is_true: false, explanation: "No" },
        c: { text: "C", is_true: true, explanation: "Yes" },
      },
      correct_answer: ["a", "c"],
      question_type: "multiple_select",
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(true);
  });

  it("rejects empty quiz", () => {
    const result = quizFileSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate question_ids", () => {
    const result = quizFileSchema.safeParse([
      makeQuestion({ question_id: 1 }),
      makeQuestion({ question_id: 1, question_text: "Another" }),
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
    }
  });

  it("rejects correct_answer referencing non-existent option", () => {
    const result = quizFileSchema.safeParse([makeQuestion({ correct_answer: "z" })]);
    expect(result.success).toBe(false);
  });

  it("rejects is_true mismatch", () => {
    const q = makeQuestion({
      options: {
        a: { text: "3", is_true: true, explanation: "Wrong" }, // should be false
        b: { text: "4", is_true: true, explanation: "Correct" },
      },
      correct_answer: "b",
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 options", () => {
    const q = makeQuestion({
      options: {
        a: { text: "Only option", is_true: true, explanation: "Only" },
      },
      correct_answer: "a",
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(false);
  });

  it("rejects missing explanation", () => {
    const q = makeQuestion({
      options: {
        a: { text: "3", is_true: false, explanation: "" },
        b: { text: "4", is_true: true, explanation: "Correct" },
      },
      correct_answer: "b",
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(false);
  });

  it("rejects uppercase option keys", () => {
    const q = makeQuestion({
      options: {
        A: { text: "3", is_true: false, explanation: "Wrong" },
        B: { text: "4", is_true: true, explanation: "Correct" },
      },
      correct_answer: "B",
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(false);
  });

  it("rejects multiple_select type with non-array correct_answer", () => {
    const q = makeQuestion({
      question_type: "multiple_select",
      correct_answer: "b",
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(false);
  });

  it("infers multiple_select from array correct_answer", () => {
    const q = makeQuestion({
      options: {
        a: { text: "A", is_true: true, explanation: "Yes" },
        b: { text: "B", is_true: false, explanation: "No" },
        c: { text: "C", is_true: true, explanation: "Yes" },
      },
      correct_answer: ["a", "c"],
    });
    const result = quizFileSchema.safeParse([q]);
    expect(result.success).toBe(true);
  });
});
