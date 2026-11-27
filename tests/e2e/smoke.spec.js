import { test, expect } from '@playwright/test';

test.describe('LINKORA Production & Staging Smoke Tests', () => {
  const backendUrl = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5002';

  test('Backend health check endpoint responds with healthy status', async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('Linkora Backend API');
    expect(body.version).toBe('1.0.0');
  });

  test('Frontend loads login screen or redirect correctly', async ({ page }) => {
    await page.goto('/');

    // When unauthenticated, user is either on /login or sees sign-in UI
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login)?$/);

    // Verify key UI text or branding
    const pageText = await page.textContent('body');
    expect(pageText).toContain('LINKORA');
  });

  test('Login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
