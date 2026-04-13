import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await new LoginPage(page).loginAsGuest();
  });

  test('renders the sidebar and topbar after login', async ({ page }) => {
    const dash = new DashboardPage(page);
    await expect(dash.sidebar).toBeVisible();
    await expect(dash.topbar).toBeVisible();
  });

  test('navigates to top-level routes without crashing', async ({ page }) => {
    const dash = new DashboardPage(page);

    // Visit each path and ensure the Shell remains mounted (no error page)
    const routes = ['/', '/github', '/ado', '/mcp', '/telemetry', '/catalog'];
    for (const path of routes) {
      await dash.goto(path);
      await expect(dash.shell).toBeVisible();
      await expect(dash.mainContent).toBeVisible();
    }
  });

  test('collapses and expands the sidebar via the toggle button', async ({ page }) => {
    const dash = new DashboardPage(page);
    const initialWidth = await dash.sidebar.evaluate((el) => el.getBoundingClientRect().width);
    await dash.sidebarToggle.click();
    await expect.poll(async () => {
      return dash.sidebar.evaluate((el) => el.getBoundingClientRect().width);
    }).not.toBe(initialWidth);
    await dash.sidebarToggle.click();
    await expect.poll(async () => {
      return dash.sidebar.evaluate((el) => el.getBoundingClientRect().width);
    }).toBe(initialWidth);
  });
});
