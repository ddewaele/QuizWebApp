import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("unauthenticated user is redirected to login from protected routes", async ({
    page,
  }) => {
    await page.goto("/quizzes");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/results");
    await expect(page).toHaveURL(/\/login/);
  });

  test("404 page shows for unknown routes when authenticated", async ({
    page,
  }) => {
    // Mock the auth endpoint to simulate logged-in user
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user",
            email: "test@example.com",
            name: "Test User",
            avatarUrl: null,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/some-nonexistent-page");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
