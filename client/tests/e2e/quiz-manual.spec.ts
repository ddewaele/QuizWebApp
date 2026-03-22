import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

const QUIZ_ID = "quiz-abc-123";
const ATTEMPT_ID = "attempt-xyz-789";
const Q1_ID = "q1-id";
const Q2_ID = "q2-id";

const CREATED_QUIZ = {
  id: QUIZ_ID,
  title: "My Manual Quiz",
  description: "Created via the UI",
  userId: "test-user-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questions: [
    {
      id: Q1_ID,
      quizId: QUIZ_ID,
      questionId: 1,
      questionText: "What is 2 + 2?",
      options: {
        a: { text: "3", is_true: false, explanation: "Incorrect." },
        b: { text: "4", is_true: true, explanation: "Correct!" },
      },
      correctAnswer: ["b"],
      sortOrder: 0,
    },
    {
      id: Q2_ID,
      quizId: QUIZ_ID,
      questionId: 2,
      questionText: "What colour is the sky?",
      options: {
        a: { text: "Blue", is_true: true, explanation: "Correct!" },
        b: { text: "Green", is_true: false, explanation: "Incorrect." },
      },
      correctAnswer: ["a"],
      sortOrder: 1,
    },
  ],
  _count: { questions: 2, attempts: 0 },
};

test.describe("Create quiz manually", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route("**/api/quizzes", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ quiz: CREATED_QUIZ }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ quizzes: [] }),
        });
      }
    });

    await page.route(`**/api/quizzes/${QUIZ_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ quiz: CREATED_QUIZ }),
      }),
    );
  });

  test("user fills in the form and the quiz detail page is shown after creation", async ({
    page,
  }) => {
    await page.goto("/quizzes/new");

    // Fill in title and description (form labels have no htmlFor — use placeholder)
    await page.getByPlaceholder("My Quiz").fill("My Manual Quiz");
    await page.getByPlaceholder("A brief description...").fill("Created via the UI");

    // textarea[0]=description, textarea[1]=Q1 question text
    await page.locator("textarea").nth(1).fill("What is 2 + 2?");

    // Q1: fill option texts and explanations
    const optionInputs = page.locator("input[placeholder='Option text']");
    const explanationInputs = page.locator("input[placeholder='Explanation']");
    await optionInputs.nth(0).fill("3");
    await explanationInputs.nth(0).fill("Incorrect.");
    await optionInputs.nth(1).fill("4");
    await explanationInputs.nth(1).fill("Correct!");

    // Q1: default correctAnswer=["a"]. Switch to b.
    // Only option B has title="Mark as correct" (A is already correct by default).
    await page.locator('button[title="Mark as correct"]').first().click();

    // Add Q2
    await page.getByRole("button", { name: "+ Add Question" }).click();

    // Q2: textarea[2] = Q2 question text
    await page.locator("textarea").nth(2).fill("What colour is the sky?");

    // Q2: fill option texts and explanations
    await optionInputs.nth(2).fill("Blue");
    await explanationInputs.nth(2).fill("Correct!");
    await optionInputs.nth(3).fill("Green");
    await explanationInputs.nth(3).fill("Incorrect.");

    // Q2: default correctAnswer=["a"] = "Blue" — already correct, no click needed

    // Submit
    await page.getByRole("button", { name: "Create Quiz" }).click();

    // Should land on the quiz detail page
    await expect(page).toHaveURL(`/quizzes/${QUIZ_ID}`);
    await expect(page.getByRole("heading", { name: "My Manual Quiz" })).toBeVisible();
    await expect(page.getByText("2 questions")).toBeVisible();
  });
});

test.describe("Execute a manually created quiz", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route(`**/api/quizzes/${QUIZ_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ quiz: CREATED_QUIZ }),
      }),
    );

    await page.route(`**/api/quizzes/${QUIZ_ID}/attempts`, (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          attempt: {
            id: ATTEMPT_ID,
            quizId: QUIZ_ID,
            userId: "test-user-id",
            score: 1,
            totalQuestions: 2,
            percentage: 50,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            quiz: { id: QUIZ_ID, title: "My Manual Quiz" },
            answers: [
              {
                id: "ans-1",
                attemptId: ATTEMPT_ID,
                questionId: Q1_ID,
                selectedKeys: ["b"],
                isCorrect: true,
                question: CREATED_QUIZ.questions[0],
              },
              {
                id: "ans-2",
                attemptId: ATTEMPT_ID,
                questionId: Q2_ID,
                selectedKeys: ["b"],
                isCorrect: false,
                question: CREATED_QUIZ.questions[1],
              },
            ],
          },
        }),
      }),
    );

    await page.route(`**/api/attempts/${ATTEMPT_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          attempt: {
            id: ATTEMPT_ID,
            quizId: QUIZ_ID,
            userId: "test-user-id",
            score: 1,
            totalQuestions: 2,
            percentage: 50,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            quiz: { id: QUIZ_ID, title: "My Manual Quiz" },
            answers: [
              {
                id: "ans-1",
                attemptId: ATTEMPT_ID,
                questionId: Q1_ID,
                selectedKeys: ["b"],
                isCorrect: true,
                question: CREATED_QUIZ.questions[0],
              },
              {
                id: "ans-2",
                attemptId: ATTEMPT_ID,
                questionId: Q2_ID,
                selectedKeys: ["b"],
                isCorrect: false,
                question: CREATED_QUIZ.questions[1],
              },
            ],
          },
        }),
      }),
    );
  });

  test("user answers 1 correct and 1 wrong, sees 50% result", async ({ page }) => {
    await page.goto(`/quizzes/${QUIZ_ID}/take`);

    // Q1: select correct answer B ("4")
    await page.getByRole("button", { name: /B\.\s*4/ }).click();

    // Go to Q2
    await page.getByRole("button", { name: "Next" }).click();

    // Q2: select wrong answer B ("Green")
    await page.getByRole("button", { name: /B\.\s*Green/ }).click();

    // Submit
    await page.getByRole("button", { name: "Submit Quiz" }).click();
    await page.getByRole("button", { name: "Confirm Submit" }).click();

    // Results page
    await expect(page).toHaveURL(`/results/${ATTEMPT_ID}`);
    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText("1 out of 2 correct")).toBeVisible();
  });
});
