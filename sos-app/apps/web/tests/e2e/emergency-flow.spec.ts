import { test, expect } from '@playwright/test';

test.describe('Emergency Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
  });

  test('should display landing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('SOS App');
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('text=Register')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.click('text=Register');
    await expect(page).toHaveURL(/.*register/);
    await expect(page.locator('h2')).toContainText('Create your account');
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phoneNumber"]')).toBeVisible();
  });

  test('should show validation errors on incomplete registration', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
  });

  // Mock authentication for dashboard tests
  test('should display dashboard for authenticated user', async ({ page, context }) => {
    // Set auth cookie (would be set by actual login)
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    await expect(page.locator('h1')).toContainText('SOS Dashboard');
    await expect(page.locator('text=Emergency Alert')).toBeVisible();
  });

  test('should show emergency button on dashboard', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    const sosButton = page.locator('button:has-text("SOS")');
    await expect(sosButton).toBeVisible();
  });

  test('should show countdown modal when emergency button clicked', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    await page.click('button:has-text("SOS")');

    // Countdown modal should appear
    await expect(page.locator('text=Emergency Alert Activating')).toBeVisible();
    await expect(page.locator('text=Cancel Emergency')).toBeVisible();
  });

  test('should cancel emergency when cancel button clicked', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    await page.click('button:has-text("SOS")');
    await expect(page.locator('text=Emergency Alert Activating')).toBeVisible();

    // Cancel the emergency
    await page.click('text=Cancel Emergency');
    await expect(page.locator('text=Emergency Alert Activating')).not.toBeVisible();
  });

  test('should navigate to contacts page', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    await page.click('text=Emergency Contacts');
    await expect(page).toHaveURL(/.*contacts/);
    await expect(page.locator('h1')).toContainText('Emergency Contacts');
  });

  test('should navigate to medical profile page', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    await page.click('text=Medical Profile');
    await expect(page).toHaveURL(/.*medical/);
    await expect(page.locator('h1')).toContainText('Medical Profile');
  });

  test('should navigate to emergency history', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_token_for_testing',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('http://localhost:3000/dashboard');
    await page.click('text=View History');
    await expect(page).toHaveURL(/.*history/);
    await expect(page.locator('h1')).toContainText('Emergency History');
  });
});
