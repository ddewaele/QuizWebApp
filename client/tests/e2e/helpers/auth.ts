import type { Page } from "@playwright/test";

export const TEST_USER = {
  id: "test-user-id",
  email: "davy@example.com",
  name: "Davy De Waele",
  avatarUrl: "https://lh3.googleusercontent.com/a/test-avatar=s96-c",
  createdAt: new Date().toISOString(),
};

/** Mock /api/auth/me to return a logged-in user. */
export async function mockAuthenticatedUser(page: Page) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: TEST_USER }),
    }),
  );
}
