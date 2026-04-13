import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly root: Locator;
  readonly githubButton: Locator;
  readonly microsoftButton: Locator;
  readonly googleButton: Locator;
  readonly guestButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('login-page');
    this.githubButton = page.getByTestId('login-github');
    this.microsoftButton = page.getByTestId('login-microsoft');
    this.googleButton = page.getByTestId('login-google');
    this.guestButton = page.getByTestId('login-guest');
  }

  async goto() {
    await this.page.goto('/');
  }

  async loginAsGuest() {
    await this.guestButton.click();
    // Authenticated app renders the Shell
    await this.page.getByTestId('shell').waitFor();
  }
}
