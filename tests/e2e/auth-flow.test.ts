import type { Browser, Page } from "puppeteer";
import { BASE_URL, launchBrowser } from "./puppeteer.config";

describe("Auth flow - protected routes", () => {
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

  it("should redirect /dashboard to /login when not authenticated", async () => {
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // The page should either redirect to /login or show a login prompt
    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);

    const redirectedToLogin = url.includes("/login");
    const showsLoginPrompt =
      bodyText.toLowerCase().includes("log in") ||
      bodyText.toLowerCase().includes("login") ||
      bodyText.toLowerCase().includes("sign in");

    expect(redirectedToLogin || showsLoginPrompt).toBe(true);
  });

  it("should redirect /dashboard/settings to /login when not authenticated", async () => {
    await page.goto(`${BASE_URL}/dashboard/settings`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);

    const redirectedToLogin = url.includes("/login");
    const showsLoginPrompt =
      bodyText.toLowerCase().includes("log in") ||
      bodyText.toLowerCase().includes("login") ||
      bodyText.toLowerCase().includes("sign in");

    expect(redirectedToLogin || showsLoginPrompt).toBe(true);
  });

  it("should redirect /dashboard/pedigrees to /login when not authenticated", async () => {
    await page.goto(`${BASE_URL}/dashboard/pedigrees`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);

    const redirectedToLogin = url.includes("/login");
    const showsLoginPrompt =
      bodyText.toLowerCase().includes("log in") ||
      bodyText.toLowerCase().includes("login") ||
      bodyText.toLowerCase().includes("sign in");

    expect(redirectedToLogin || showsLoginPrompt).toBe(true);
  });
});
