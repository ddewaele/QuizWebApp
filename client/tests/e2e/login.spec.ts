import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("displays the app name and sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("QuizApp")).toBeVisible();
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });

  test("Google sign-in button links to OAuth endpoint", async ({ page }) => {
    await page.goto("/login");
    const link = page.getByRole("link", { name: /Continue with Google/i });
    await expect(link).toHaveAttribute("href", "/api/auth/google");
  });

  test("shows error message when OAuth fails", async ({ page }) => {
    await page.goto("/login?error=oauth_failed");
    await expect(
      page.getByText("Google sign-in failed"),
    ).toBeVisible();
  });
});
