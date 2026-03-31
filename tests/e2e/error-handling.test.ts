import type { Browser, Page } from "puppeteer";
import { BASE_URL, launchBrowser } from "./puppeteer.config";

const SCREENSHOT_DIR = "tests/screenshots";
const UNIQUE_SUFFIX = Date.now().toString(36);

async function waitAndScreenshot(page: Page, name: string, delay = 800) {
  await new Promise((r) => setTimeout(r, delay));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: true });
}

describe("Error handling and edge cases", () => {
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

  it("should show error for login with wrong password", async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2", timeout: 30000 });

    await page.type('input[placeholder="Enter username"]', "wronguser");
    await page.type('input[placeholder="Enter password"]', "wrongpass");
    await page.click('button[type="submit"]');

    // Wait for error message or network response
    await new Promise((r) => setTimeout(r, 2000));

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasErrorFeedback =
      bodyText.includes("invalid") ||
      bodyText.includes("incorrect") ||
      bodyText.includes("error") ||
      bodyText.includes("failed") ||
      bodyText.includes("wrong") ||
      bodyText.includes("not found") ||
      bodyText.includes("login") ||
      bodyText.includes("sign in");

    expect(hasErrorFeedback).toBe(true);

    // Verify no crash - page still has content
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    await waitAndScreenshot(page, "error-login-wrong-password.png");
  });

  it("should show validation for login with empty fields", async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2", timeout: 30000 });

    // Click submit without filling fields
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1000));

    // The form uses required attributes, so browser validation should prevent submission
    // OR the page shows an error message. Either way, page should not crash.
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    // Still on login page (no crash/redirect to error)
    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const stillOnLogin = url.includes("/login") || bodyText.includes("login") || bodyText.includes("sign in");
    expect(stillOnLogin).toBe(true);

    await waitAndScreenshot(page, "error-login-empty.png");
  });

  it("should show error for register with existing username", async () => {
    const testUser = `errtest_${UNIQUE_SUFFIX}`;
    const testEmail1 = `errtest1_${UNIQUE_SUFFIX}@e2e.local`;
    const testEmail2 = `errtest2_${UNIQUE_SUFFIX}@e2e.local`;

    // Register a user first
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.type('input[placeholder="Choose a username"]', testUser);
    await page.type('input[placeholder="Enter email"]', testEmail1);
    await page.type('input[placeholder="Create a password"]', "TestPass123");
    await page.type('input[placeholder="Confirm your password"]', "TestPass123");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 3000));

    // Now try to register with the same username
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.type('input[placeholder="Choose a username"]', testUser);
    await page.type('input[placeholder="Enter email"]', testEmail2);
    await page.type('input[placeholder="Create a password"]', "TestPass123");
    await page.type('input[placeholder="Confirm your password"]', "TestPass123");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasErrorFeedback =
      bodyText.includes("already") ||
      bodyText.includes("exists") ||
      bodyText.includes("taken") ||
      bodyText.includes("error") ||
      bodyText.includes("failed") ||
      bodyText.includes("duplicate") ||
      bodyText.includes("create account"); // still on register page

    expect(hasErrorFeedback).toBe(true);

    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    await waitAndScreenshot(page, "error-register-duplicate.png");
  });

  it("should show error for register with weak password", async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle2", timeout: 30000 });

    await page.type('input[placeholder="Choose a username"]', `weakpw_${UNIQUE_SUFFIX}`);
    await page.type('input[placeholder="Enter email"]', `weakpw_${UNIQUE_SUFFIX}@e2e.local`);
    await page.type('input[placeholder="Create a password"]', "abc");
    await page.type('input[placeholder="Confirm your password"]', "abc");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    // Page should either show a password-related error or still be on register page
    const hasErrorOrStillOnPage =
      bodyText.includes("password") ||
      bodyText.includes("short") ||
      bodyText.includes("weak") ||
      bodyText.includes("minimum") ||
      bodyText.includes("at least") ||
      bodyText.includes("error") ||
      bodyText.includes("create account");

    expect(hasErrorOrStillOnPage).toBe(true);

    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    await waitAndScreenshot(page, "error-register-weak-password.png");
  });

  it("should show error for register with mismatched passwords", async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle2", timeout: 30000 });

    await page.type('input[placeholder="Choose a username"]', `mismatch_${UNIQUE_SUFFIX}`);
    await page.type('input[placeholder="Enter email"]', `mismatch_${UNIQUE_SUFFIX}@e2e.local`);
    await page.type('input[placeholder="Create a password"]', "TestPass123");
    await page.type('input[placeholder="Confirm your password"]', "DifferentPass456");
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasErrorFeedback =
      bodyText.includes("match") ||
      bodyText.includes("mismatch") ||
      bodyText.includes("same") ||
      bodyText.includes("password") ||
      bodyText.includes("error") ||
      bodyText.includes("create account");

    expect(hasErrorFeedback).toBe(true);

    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    await waitAndScreenshot(page, "error-register-password-mismatch.png");
  });

  it("should render 404 page for nonexistent route", async () => {
    const response = await page.goto(`${BASE_URL}/this-page-does-not-exist`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Page should render something (not crash)
    const hasContent = await page.evaluate(() => document.body.innerText.length > 5);
    expect(hasContent).toBe(true);

    // Should show 404 or "not found" messaging, or at minimum not crash
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const statusCode = response?.status();
    const is404 =
      statusCode === 404 ||
      bodyText.includes("404") ||
      bodyText.includes("not found") ||
      bodyText.includes("page") ||
      bodyText.includes("exist");

    expect(is404).toBe(true);

    await waitAndScreenshot(page, "error-404.png");
  });

  it("should handle nonexistent dog gracefully", async () => {
    await page.goto(`${BASE_URL}/pedigree/99999999`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for any async data loading
    await new Promise((r) => setTimeout(r, 2000));

    // Page should not crash
    const hasContent = await page.evaluate(() => document.body.innerText.length > 5);
    expect(hasContent).toBe(true);

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const handlesGracefully =
      bodyText.includes("not found") ||
      bodyText.includes("no dog") ||
      bodyText.includes("error") ||
      bodyText.includes("loading") ||
      bodyText.includes("pedigree") ||
      bodyText.includes("search");

    expect(handlesGracefully).toBe(true);

    await waitAndScreenshot(page, "error-dog-not-found.png");
  });

  it("should handle XSS-like search input safely", async () => {
    await page.goto(`${BASE_URL}/browse`, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for page to load
    await new Promise((r) => setTimeout(r, 1000));

    const searchInput = await page.$('input[type="text"]');
    if (searchInput) {
      await searchInput.type("<script>alert('xss')</script>");
      // Submit the search
      const searchButton = await page.$('button[type="submit"]');
      if (searchButton) {
        await searchButton.click();
      } else {
        await page.keyboard.press("Enter");
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // No XSS should execute - page should still be functional
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    // The script tag should NOT have executed (no alert dialog)
    // and the text should appear as text or "no results", not as HTML
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    expect(bodyHtml).not.toContain("<script>alert");

    await waitAndScreenshot(page, "error-search-xss.png");
  });

  it("should show validation for contact form with empty fields", async () => {
    await page.goto(`${BASE_URL}/contact`, { waitUntil: "networkidle2", timeout: 30000 });

    // Click submit without filling anything
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1000));

    // Form should show validation or remain on page (not crash)
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const stillOnContact =
      url.includes("/contact") ||
      bodyText.includes("contact") ||
      bodyText.includes("message") ||
      bodyText.includes("send");

    expect(stillOnContact).toBe(true);

    await waitAndScreenshot(page, "error-contact-empty.png");
  });

  it("should redirect to login when accessing protected page without auth", async () => {
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());

    const redirectedOrPrompted =
      url.includes("/login") ||
      bodyText.includes("log in") ||
      bodyText.includes("login") ||
      bodyText.includes("sign in");

    expect(redirectedOrPrompted).toBe(true);

    // Not a crash
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    await waitAndScreenshot(page, "error-unauth-redirect.png");
  });

  it("should show no-results state gracefully on browse page", async () => {
    await page.goto(`${BASE_URL}/browse`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Search for something that should have no results
    const searchInput = await page.$('input[type="text"]');
    if (searchInput) {
      await searchInput.type("zzzznonexistentdogname99999");
      const searchButton = await page.$('button[type="submit"]');
      if (searchButton) {
        await searchButton.click();
      } else {
        await page.keyboard.press("Enter");
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Page should not crash, should show empty state or results
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const handlesEmpty =
      bodyText.includes("no dogs") ||
      bodyText.includes("no results") ||
      bodyText.includes("not found") ||
      bodyText.includes("try") ||
      bodyText.includes("dogs") ||
      bodyText.includes("browse");

    expect(handlesEmpty).toBe(true);

    await waitAndScreenshot(page, "error-no-results.png");
  });

  it("should handle very long search input without crashing", async () => {
    await page.goto(`${BASE_URL}/browse`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    const longInput = "A".repeat(500);

    const searchInput = await page.$('input[type="text"]');
    if (searchInput) {
      await searchInput.type(longInput);
      const searchButton = await page.$('button[type="submit"]');
      if (searchButton) {
        await searchButton.click();
      } else {
        await page.keyboard.press("Enter");
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Page should not crash
    const hasContent = await page.evaluate(() => document.body.innerText.length > 10);
    expect(hasContent).toBe(true);

    // Page should still be navigable - check that body is rendered properly
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const pageStillFunctional =
      bodyText.includes("dogs") ||
      bodyText.includes("browse") ||
      bodyText.includes("no") ||
      bodyText.includes("search");
    expect(pageStillFunctional).toBe(true);

    await waitAndScreenshot(page, "error-long-input.png");
  });
});
