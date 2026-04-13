import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly shell: Locator;
  readonly sidebar: Locator;
  readonly topbar: Locator;
  readonly mainContent: Locator;
  readonly sidebarToggle: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = page.getByTestId('shell');
    this.sidebar = page.getByTestId('sidebar');
    this.topbar = page.getByTestId('topbar');
    this.mainContent = page.getByTestId('main-content');
    this.sidebarToggle = page.getByTestId('sidebar-toggle');
    this.signOutButton = page.getByTestId('sidebar-signout');
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  navLink(routeTestid: string): Locator {
    return this.page.getByTestId(`sidebar-nav-${routeTestid}`);
  }
}
