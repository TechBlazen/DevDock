import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Auth flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean slate for every test
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
  });

  test('renders the login page with all OAuth providers and guest option', async ({ page }) => {
    const login = new LoginPage(page);
    await expect(login.root).toBeVisible();
    await expect(login.githubButton).toBeVisible();
    await expect(login.microsoftButton).toBeVisible();
    await expect(login.googleButton).toBeVisible();
    await expect(login.guestButton).toBeVisible();
  });

  test('signs in as guest and renders the Shell', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsGuest();
    const dash = new DashboardPage(page);
    await expect(dash.shell).toBeVisible();
    await expect(dash.sidebar).toBeVisible();
    await expect(dash.topbar).toBeVisible();
    await expect(dash.mainContent).toBeVisible();
  });

  test('persists authenticated state across page reloads', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsGuest();
    await page.reload();
    const dash = new DashboardPage(page);
    await expect(dash.shell).toBeVisible();
  });

  test('signs out and returns to login page', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginAsGuest();
    const dash = new DashboardPage(page);
    await dash.signOutButton.click();
    await expect(login.root).toBeVisible();
  });
});
