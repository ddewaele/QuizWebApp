import { describe, it, expect } from "vitest";
import { quizFileSchema } from "../../shared/quiz-file.schema";

const VALID_META = { title: "Test Quiz", version: "1.0.0" };

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    question_id: 1,
    question_text: "What is 2+2?",
    options: {
      a: { text: "3", is_true: false, explanation: "Wrong" },
      b: { text: "4", is_true: true, explanation: "Correct" },
    },
    correct_answer: ["b"],
    ...overrides,
  };
}

function makeQuizFile(questions: unknown[], metaOverrides: Record<string, unknown> = {}) {
  return { meta: { ...VALID_META, ...metaOverrides }, questions };
}

describe("Quiz file validation", () => {
  it("accepts a valid single-select question", () => {
    const result = quizFileSchema.safeParse(makeQuizFile([makeQuestion()]));
    expect(result.success).toBe(true);
  });

  it("accepts a valid multiple-select question", () => {
    const q = makeQuestion({
      options: {
        a: { text: "A", is_true: true, explanation: "Yes" },
        b: { text: "B", is_true: false, explanation: "No" },
        c: { text: "C", is_true: true, explanation: "Yes" },
      },
      correct_answer: ["a", "c"],
    });
    const result = quizFileSchema.safeParse(makeQuizFile([q]));
    expect(result.success).toBe(true);
  });

  it("accepts optional question fields: difficulty, topic, tags", () => {
    const q = makeQuestion({ difficulty: "hard", topic: "Math", tags: ["arithmetic"] });
    const result = quizFileSchema.safeParse(makeQuizFile([q]));
    expect(result.success).toBe(true);
  });

  it("accepts optional meta fields: subject, created", () => {
    const result = quizFileSchema.safeParse(
      makeQuizFile([makeQuestion()], { subject: "Azure", created: "2025-01-01" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects missing meta.version", () => {
    const result = quizFileSchema.safeParse(
      makeQuizFile([makeQuestion()], { version: undefined }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid semver in meta.version", () => {
    const result = quizFileSchema.safeParse(
      makeQuizFile([makeQuestion()], { version: "v1.0" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects missing meta block", () => {
    const result = quizFileSchema.safeParse([makeQuestion()]);
    expect(result.success).toBe(false);
  });

  it("rejects missing meta.title", () => {
    const result = quizFileSchema.safeParse({ meta: {}, questions: [makeQuestion()] });
    expect(result.success).toBe(false);
  });

  it("rejects empty questions array", () => {
    const result = quizFileSchema.safeParse(makeQuizFile([]));
    expect(result.success).toBe(false);
  });

  it("rejects duplicate question_ids", () => {
    const result = quizFileSchema.safeParse(
      makeQuizFile([
        makeQuestion({ question_id: 1 }),
        makeQuestion({ question_id: 1, question_text: "Another" }),
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
    }
  });

  it("rejects correct_answer referencing non-existent option", () => {
    const result = quizFileSchema.safeParse(makeQuizFile([makeQuestion({ correct_answer: ["z"] })]));
    expect(result.success).toBe(false);
  });

  it("rejects is_true mismatch", () => {
    const q = makeQuestion({
      options: {
        a: { text: "3", is_true: true, explanation: "Wrong" },
        b: { text: "4", is_true: true, explanation: "Correct" },
      },
      correct_answer: ["b"],
    });
    const result = quizFileSchema.safeParse(makeQuizFile([q]));
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 options", () => {
    const q = makeQuestion({
      options: { a: { text: "Only option", is_true: true, explanation: "Only" } },
      correct_answer: ["a"],
    });
    const result = quizFileSchema.safeParse(makeQuizFile([q]));
    expect(result.success).toBe(false);
  });

  it("rejects missing explanation", () => {
    const q = makeQuestion({
      options: {
        a: { text: "3", is_true: false, explanation: "" },
        b: { text: "4", is_true: true, explanation: "Correct" },
      },
      correct_answer: ["b"],
    });
    const result = quizFileSchema.safeParse(makeQuizFile([q]));
    expect(result.success).toBe(false);
  });

  it("rejects uppercase option keys", () => {
    const q = makeQuestion({
      options: {
        A: { text: "3", is_true: false, explanation: "Wrong" },
        B: { text: "4", is_true: true, explanation: "Correct" },
      },
      correct_answer: ["B"],
    });
    const result = quizFileSchema.safeParse(makeQuizFile([q]));
    expect(result.success).toBe(false);
  });

  it("rejects string correct_answer (must be array)", () => {
    const result = quizFileSchema.safeParse(makeQuizFile([makeQuestion({ correct_answer: "b" })]));
    expect(result.success).toBe(false);
  });

  it("rejects empty correct_answer array", () => {
    const result = quizFileSchema.safeParse(makeQuizFile([makeQuestion({ correct_answer: [] })]));
    expect(result.success).toBe(false);
  });

  it("rejects invalid difficulty value", () => {
    const result = quizFileSchema.safeParse(
      makeQuizFile([makeQuestion({ difficulty: "extreme" })]),
    );
    expect(result.success).toBe(false);
  });
});
