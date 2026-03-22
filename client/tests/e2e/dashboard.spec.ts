import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

test.describe("Dashboard — first-time user", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    // No quizzes, no attempts
    await page.route("**/api/quizzes", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ quizzes: [] }),
      }),
    );
    await page.route("**/api/attempts", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ attempts: [] }),
      }),
    );

    await page.goto("/");
  });

  test("shows personalised welcome heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Welcome, Davy" })).toBeVisible();
    await expect(page.getByText("Here's your quiz overview")).toBeVisible();
  });

  test("stats cards show zeros and no average score", async ({ page }) => {
    // Stat card labels are <p class="text-sm text-gray-500"> elements
    const statLabel = page.locator("p.text-sm.text-gray-500");
    await expect(statLabel.getByText("Quizzes", { exact: true })).toBeVisible();
    await expect(statLabel.getByText("Attempts", { exact: true })).toBeVisible();
    await expect(statLabel.getByText("Average Score", { exact: true })).toBeVisible();

    // Both numeric stats are 0
    const statValues = page.locator("p.text-3xl");
    await expect(statValues.first()).toHaveText("0");

    // No average score available — shown as "--"
    await expect(page.getByText("--")).toBeVisible();
  });

  test("Create Quiz and Upload JSON buttons are present", async ({ page }) => {
    // These are <Link> elements (rendered as anchors), not <button>
    await expect(page.getByRole("link", { name: "Create Quiz" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Upload JSON" })).toBeVisible();
  });

  test("empty state messages are shown", async ({ page }) => {
    await expect(
      page.getByText("No quizzes yet. Create or upload one to get started."),
    ).toBeVisible();
    await expect(
      page.getByText("No attempts yet. Take a quiz to see your results here."),
    ).toBeVisible();
  });

  test("navbar shows user name and sign out button", async ({ page }) => {
    await expect(page.getByText("Davy De Waele")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
