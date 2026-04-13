import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await new LoginPage(page).loginAsGuest();
  });

  test('renders the dashboard main content region', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto('/');
    await expect(dash.mainContent).toBeVisible();
  });

  test('uses the branded app name from settings as document title', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto('/');
    // Branding default is "DevDock"; App.tsx sets document.title from branding.appName
    await expect(page).toHaveTitle(/DevDock/i);
  });
});
