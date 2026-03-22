import { describe, it, expect } from "vitest";

/**
 * Test the scoring logic in isolation.
 * Mirrors the checkAnswer function from attempt.service.ts.
 * correct_answer is always string[].
 */
function checkAnswer(
  correctAnswer: string[],
  selectedKeys: string[],
): boolean {
  if (correctAnswer.length !== selectedKeys.length) return false;
  const correctSet = new Set(correctAnswer);
  return selectedKeys.every((key) => correctSet.has(key));
}

describe("Scoring logic", () => {
  describe("Single-select", () => {
    it("correct when selected matches", () => {
      expect(checkAnswer(["b"], ["b"])).toBe(true);
    });

    it("incorrect when selected does not match", () => {
      expect(checkAnswer(["b"], ["a"])).toBe(false);
    });

    it("incorrect when multiple selected for single-select", () => {
      expect(checkAnswer(["b"], ["a", "b"])).toBe(false);
    });

    it("incorrect when nothing selected", () => {
      expect(checkAnswer(["b"], [])).toBe(false);
    });
  });

  describe("Multiple-select", () => {
    it("correct when exact match", () => {
      expect(checkAnswer(["a", "c"], ["a", "c"])).toBe(true);
    });

    it("correct when selected in different order", () => {
      expect(checkAnswer(["a", "c"], ["c", "a"])).toBe(true);
    });

    it("incorrect with extra selection", () => {
      expect(checkAnswer(["a", "c"], ["a", "b", "c"])).toBe(false);
    });

    it("incorrect with missing selection", () => {
      expect(checkAnswer(["a", "c"], ["a"])).toBe(false);
    });

    it("incorrect when nothing selected", () => {
      expect(checkAnswer(["a", "c"], [])).toBe(false);
    });

    it("incorrect with completely wrong selection", () => {
      expect(checkAnswer(["a", "c"], ["b", "d"])).toBe(false);
    });
  });
});
