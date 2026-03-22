import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

const QUIZ_ID = "quiz-hints-test";
const QUESTION_ID = "q-hints-1";

const QUIZ = {
  id: QUIZ_ID,
  title: "Hints Test Quiz",
  description: "",
  userId: "test-user-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questions: [
    {
      id: QUESTION_ID,
      quizId: QUIZ_ID,
      questionId: 1,
      questionText: "What is the capital of France?",
      options: {
        a: { text: "London", is_true: false, explanation: "London is the capital of England." },
        b: { text: "Paris", is_true: true, explanation: "Paris is the capital of France." },
        c: { text: "Berlin", is_true: false, explanation: "Berlin is the capital of Germany." },
      },
      correctAnswer: ["b"],
      sortOrder: 0,
    },
  ],
  _count: { questions: 1, attempts: 0 },
};

test.describe("Quiz player — Check Answer and Show Hints", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route(`**/api/quizzes/${QUIZ_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ quiz: QUIZ }),
      }),
    );

    await page.goto(`/quizzes/${QUIZ_ID}/take`);
  });

  test("Check Answer button is disabled until an option is selected", async ({ page }) => {
    const checkBtn = page.getByRole("button", { name: "Check Answer" });
    await expect(checkBtn).toBeVisible();
    await expect(checkBtn).toBeDisabled();

    // Select option A
    await page.getByRole("button", { name: /A\.\s*London/ }).click();
    await expect(checkBtn).toBeEnabled();
  });

  test("Check Answer shows correct result and explanations for a correct selection", async ({
    page,
  }) => {
    // Select correct answer (B — Paris)
    await page.getByRole("button", { name: /B\.\s*Paris/ }).click();
    await page.getByRole("button", { name: "Check Answer" }).click();

    // Correct banner visible
    await expect(page.getByText("Correct! Well done.")).toBeVisible();

    // Explanation for the selected correct option is shown
    await expect(page.getByText("Paris is the capital of France.")).toBeVisible();
  });

  test("Check Answer shows incorrect result for a wrong selection", async ({
    page,
  }) => {
    // Select wrong answer (A — London)
    await page.getByRole("button", { name: /A\.\s*London/ }).click();
    await page.getByRole("button", { name: "Check Answer" }).click();

    // Incorrect banner visible
    await expect(page.getByText(/Incorrect/)).toBeVisible();

    // Only the selected option's explanation is shown
    await expect(page.getByText("London is the capital of England.")).toBeVisible();
    // Unselected options' explanations are NOT shown
    await expect(page.getByText("Paris is the capital of France.")).not.toBeVisible();
    await expect(page.getByText("Berlin is the capital of Germany.")).not.toBeVisible();
  });

  test("Hide Answer button collapses the result and explanations", async ({ page }) => {
    await page.getByRole("button", { name: /A\.\s*London/ }).click();
    await page.getByRole("button", { name: "Check Answer" }).click();
    await expect(page.getByText(/Incorrect/)).toBeVisible();

    await page.getByRole("button", { name: "Hide Answer" }).click();
    await expect(page.getByText(/Incorrect/)).not.toBeVisible();
    await expect(page.getByText("London is the capital of England.")).not.toBeVisible();
  });

  test("Show Hints reveals correct/incorrect badges and explanations without judging selection", async ({
    page,
  }) => {
    // Don't select anything yet — hints should still work
    await page.getByRole("button", { name: "Show Hints" }).click();

    // Each option gets a correct/wrong badge
    await expect(page.getByText("✓ Correct").first()).toBeVisible();
    // Wrong badge (there are 2 wrong options)
    await expect(page.getByText("✗ Wrong").first()).toBeVisible();

    // All explanations are shown
    await expect(page.getByText("London is the capital of England.")).toBeVisible();
    await expect(page.getByText("Paris is the capital of France.")).toBeVisible();
    await expect(page.getByText("Berlin is the capital of Germany.")).toBeVisible();
  });

  test("Hide Hints collapses badges and explanations", async ({ page }) => {
    await page.getByRole("button", { name: "Show Hints" }).click();
    await expect(page.getByText("Berlin is the capital of Germany.")).toBeVisible();

    await page.getByRole("button", { name: "Hide Hints" }).click();
    await expect(page.getByText("Berlin is the capital of Germany.")).not.toBeVisible();
  });

  test("Changing selection after Check Answer clears the result", async ({ page }) => {
    // Check a wrong answer
    await page.getByRole("button", { name: /A\.\s*London/ }).click();
    await page.getByRole("button", { name: "Check Answer" }).click();
    await expect(page.getByText(/Incorrect/)).toBeVisible();

    // Click a different option — the check result should be cleared
    await page.getByRole("button", { name: /B\.\s*Paris/ }).click();
    await expect(page.getByText(/Incorrect/)).not.toBeVisible();
    await expect(page.getByText(/Correct! Well done./)).not.toBeVisible();
  });
});
