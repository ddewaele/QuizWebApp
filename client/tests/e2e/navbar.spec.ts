import { test, expect } from "@playwright/test";

test.describe("Navbar", () => {
  test.beforeEach(async ({ page }) => {
    // Simulate an authenticated user with a Google avatar URL
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user",
            email: "test@example.com",
            name: "Davy De Waele",
            avatarUrl:
              "https://lh3.googleusercontent.com/a/test-avatar=s96-c",
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/");
  });

  test("avatar img has referrerPolicy=no-referrer to prevent broken image on Google CDN", async ({
    page,
  }) => {
    const avatar = page.locator("img.rounded-full").first();
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  test("avatar img src points to the user avatarUrl", async ({ page }) => {
    const avatar = page.locator("img.rounded-full").first();
    await expect(avatar).toHaveAttribute(
      "src",
      "https://lh3.googleusercontent.com/a/test-avatar=s96-c",
    );
  });
});
