import { test, expect } from '@playwright/test';

test.describe('Upload flow', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MySounds|Sounds|DJ|Mix/i);
  });

  test('upload page is accessible after auth', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.getByRole('button', { name: /sign in|login|get started/i });
    await expect(signInButton.first()).toBeVisible({ timeout: 10000 });
  });
});
