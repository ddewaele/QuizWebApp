import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";
import { mockAuthenticatedUser } from "./helpers/auth";

const QUIZ_ID = "quiz-upload-456";
const ATTEMPT_ID = "attempt-upload-789";
const Q1_ID = "uq1-id";
const Q2_ID = "uq2-id";

const UPLOADED_QUIZ = {
  id: QUIZ_ID,
  title: "My Uploaded Quiz",
  description: null,
  userId: "test-user-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questions: [
    {
      id: Q1_ID,
      quizId: QUIZ_ID,
      questionId: 1,
      questionText: "What is the capital of France?",
      options: {
        a: { text: "Berlin", is_true: false, explanation: "That's Germany." },
        b: { text: "Paris", is_true: true, explanation: "Correct!" },
      },
      correctAnswer: ["b"],
      sortOrder: 0,
    },
    {
      id: Q2_ID,
      quizId: QUIZ_ID,
      questionId: 2,
      questionText: "What is the capital of Japan?",
      options: {
        a: { text: "Tokyo", is_true: true, explanation: "Correct!" },
        b: { text: "Osaka", is_true: false, explanation: "That's not the capital." },
      },
      correctAnswer: ["a"],
      sortOrder: 1,
    },
  ],
  _count: { questions: 2, attempts: 0 },
};

/** Create a temporary JSON quiz file on disk for the upload test. */
function createTempQuizFile(): string {
  const content = JSON.stringify([
    {
      question_id: 1,
      question_text: "What is the capital of France?",
      options: {
        a: { text: "Berlin", is_true: false, explanation: "That's Germany." },
        b: { text: "Paris", is_true: true, explanation: "Correct!" },
      },
      correct_answer: ["b"],
    },
    {
      question_id: 2,
      question_text: "What is the capital of Japan?",
      options: {
        a: { text: "Tokyo", is_true: true, explanation: "Correct!" },
        b: { text: "Osaka", is_true: false, explanation: "That's not the capital." },
      },
      correct_answer: ["a"],
    },
  ]);

  const tmpPath = path.join(os.tmpdir(), "test-quiz.json");
  fs.writeFileSync(tmpPath, content, "utf-8");
  return tmpPath;
}

test.describe("Upload quiz via JSON", () => {
  let tmpQuizFile: string;

  test.beforeAll(() => {
    tmpQuizFile = createTempQuizFile();
  });

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route("**/api/quizzes/import", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ quiz: UPLOADED_QUIZ }),
      }),
    );

    await page.route(`**/api/quizzes/${QUIZ_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ quiz: UPLOADED_QUIZ }),
      }),
    );
  });

  test("user uploads a JSON file and sees the quiz detail page", async ({ page }) => {
    await page.goto("/quizzes/upload");

    await expect(page.getByRole("heading", { name: "Upload Quiz" })).toBeVisible();

    // Fill in the title (label has no htmlFor, use placeholder)
    await page.getByPlaceholder("My Quiz").fill("My Uploaded Quiz");

    // Upload the file
    await page.locator('input[type="file"]').setInputFiles(tmpQuizFile);

    // File should be accepted
    await expect(page.getByText("Valid JSON file")).toBeVisible();

    // Submit
    await page.getByRole("button", { name: "Upload Quiz" }).click();

    // Should land on the quiz detail page
    await expect(page).toHaveURL(`/quizzes/${QUIZ_ID}`);
    await expect(
      page.getByRole("heading", { name: "My Uploaded Quiz" }),
    ).toBeVisible();
    await expect(page.getByText("2 questions")).toBeVisible();
  });
});

test.describe("Execute an uploaded quiz", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    await page.route(`**/api/quizzes/${QUIZ_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ quiz: UPLOADED_QUIZ }),
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
            quiz: { id: QUIZ_ID, title: "My Uploaded Quiz" },
            answers: [
              {
                id: "ans-1",
                attemptId: ATTEMPT_ID,
                questionId: Q1_ID,
                selectedKeys: ["b"],
                isCorrect: true,
                question: UPLOADED_QUIZ.questions[0],
              },
              {
                id: "ans-2",
                attemptId: ATTEMPT_ID,
                questionId: Q2_ID,
                selectedKeys: ["b"],
                isCorrect: false,
                question: UPLOADED_QUIZ.questions[1],
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
            quiz: { id: QUIZ_ID, title: "My Uploaded Quiz" },
            answers: [
              {
                id: "ans-1",
                attemptId: ATTEMPT_ID,
                questionId: Q1_ID,
                selectedKeys: ["b"],
                isCorrect: true,
                question: UPLOADED_QUIZ.questions[0],
              },
              {
                id: "ans-2",
                attemptId: ATTEMPT_ID,
                questionId: Q2_ID,
                selectedKeys: ["b"],
                isCorrect: false,
                question: UPLOADED_QUIZ.questions[1],
              },
            ],
          },
        }),
      }),
    );
  });

  test("user answers 1 correct and 1 wrong, sees 50% result", async ({ page }) => {
    await page.goto(`/quizzes/${QUIZ_ID}/take`);

    // Q1: select correct answer B ("Paris")
    await page.getByRole("button", { name: /B\.\s*Paris/ }).click();

    // Navigate to Q2
    await page.getByRole("button", { name: "Next" }).click();

    // Q2: select wrong answer B ("Osaka")
    await page.getByRole("button", { name: /B\.\s*Osaka/ }).click();

    // Submit
    await page.getByRole("button", { name: "Submit Quiz" }).click();
    await page.getByRole("button", { name: "Confirm Submit" }).click();

    // Results page
    await expect(page).toHaveURL(`/results/${ATTEMPT_ID}`);
    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText("1 out of 2 correct")).toBeVisible();
  });
});
