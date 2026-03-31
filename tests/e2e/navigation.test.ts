import type { Browser, Page } from "puppeteer";
import { BASE_URL, launchBrowser } from "./puppeteer.config";

describe("Navigation flows", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
  });

  afterEach(async () => {
    await page.close();
  });

  it("should navigate from home to login via link", async () => {
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Look for a login link/button in the page
    const loginLink = await page.$('a[href="/login"], a[href*="login"]');
    expect(loginLink).not.toBeNull();

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
      loginLink!.click(),
    ]);

    expect(page.url()).toContain("/login");
  });

  it("should have email/username and password fields on login page", async () => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // The login form uses username and password fields
    const usernameField = await page.$(
      'input[type="text"], input[type="email"], input[name="username"], input[name="email"]'
    );
    const passwordField = await page.$('input[type="password"]');

    expect(usernameField).not.toBeNull();
    expect(passwordField).not.toBeNull();
  });

  it("should have form fields on register page", async () => {
    await page.goto(`${BASE_URL}/register`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const usernameField = await page.$('input[name="username"], input[placeholder*="username" i]');
    const emailField = await page.$('input[type="email"], input[name="email"]');
    const passwordField = await page.$('input[type="password"]');

    expect(usernameField).not.toBeNull();
    expect(emailField).not.toBeNull();
    expect(passwordField).not.toBeNull();
  });

  it("should have a working NavBar search input", async () => {
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/pedigree/1`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // The NavBar search has a text input — wait for hydration
    await page.waitForSelector(
      'input[placeholder*="Search"], input[placeholder*="search"]',
      { timeout: 10000 }
    );
    const searchInput = await page.$(
      'input[placeholder*="Search"], input[placeholder*="search"]'
    );
    expect(searchInput).not.toBeNull();

    // Type into search and verify input accepts text
    await searchInput!.type("test dog name");
    const value = await page.evaluate(
      (el) => (el as HTMLInputElement).value,
      searchInput!
    );
    expect(value).toBe("test dog name");
  });
});
