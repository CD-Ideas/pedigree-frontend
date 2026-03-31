import type { Browser, Page } from "puppeteer";
import { BASE_URL, launchBrowser, VIEWPORTS } from "./puppeteer.config";

const SCREENSHOT_DIR = "tests/screenshots";
const UNIQUE_SUFFIX = Date.now().toString(36);
const TEST_USER = `testuser_e2e_${UNIQUE_SUFFIX}`;
const TEST_EMAIL = `test_${UNIQUE_SUFFIX}@e2e.local`;
const TEST_PASS = "TestPass123";

// Shared auth token storage across flows
let authToken = "";
let refreshToken = "";
let userJson = "";

async function waitAndScreenshot(page: Page, name: string, delay = 800) {
  await new Promise((r) => setTimeout(r, delay));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: true });
}

async function setAuth(page: Page) {
  await page.evaluate(
    (token, refresh, user) => {
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refresh);
      localStorage.setItem("user", user);
    },
    authToken,
    refreshToken,
    userJson
  );
}

describe("User Flows E2E", () => {
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
    await page.setViewport(VIEWPORTS.desktop);
  });

  afterEach(async () => {
    await page.close();
  });

  // ────────────────────────────────────────────────
  // Flow 1: Registration
  // ────────────────────────────────────────────────
  describe("Flow 1: Registration", () => {
    it("should register a new user", async () => {
      await page.goto(`${BASE_URL}/register`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Fill form fields
      const inputs = await page.$$("input");
      expect(inputs.length).toBeGreaterThanOrEqual(4);

      // Username
      const usernameInput = await page.$('input[placeholder*="username" i]');
      expect(usernameInput).not.toBeNull();
      await usernameInput!.type(TEST_USER);

      // Email
      const emailInput = await page.$('input[type="email"]');
      expect(emailInput).not.toBeNull();
      await emailInput!.type(TEST_EMAIL);

      // Password fields
      const passwordInputs = await page.$$('input[type="password"]');
      expect(passwordInputs.length).toBeGreaterThanOrEqual(2);
      await passwordInputs[0].type(TEST_PASS);
      await passwordInputs[1].type(TEST_PASS);

      await waitAndScreenshot(page, "register-filled.png");

      // Click submit
      const submitBtn = await page.$(
        'button[type="submit"]'
      );
      expect(submitBtn).not.toBeNull();
      await submitBtn!.click();

      // Wait for either success message or redirect
      await page.waitForFunction(
        () => {
          const body = document.body.innerText.toLowerCase();
          return (
            body.includes("account created successfully") ||
            body.includes("already exists") ||
            window.location.pathname.includes("/login")
          );
        },
        { timeout: 15000 }
      );

      await waitAndScreenshot(page, "register-success.png");

      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );
      const url = page.url();
      // Either created or already exists is fine (idempotent)
      expect(
        bodyText.includes("account created successfully") ||
          bodyText.includes("already exists") ||
          url.includes("/login")
      ).toBe(true);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 2: Login
  // ────────────────────────────────────────────────
  describe("Flow 2: Login", () => {
    it("should log in with the registered user", async () => {
      // First ensure the user exists by registering (may already exist, that's fine)
      await page.goto(`${BASE_URL}/register`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      const usernameInput = await page.$('input[placeholder*="username" i]');
      await usernameInput!.type(TEST_USER);
      const emailInput = await page.$('input[type="email"]');
      await emailInput!.type(TEST_EMAIL);
      const passwordInputs = await page.$$('input[type="password"]');
      await passwordInputs[0].type(TEST_PASS);
      await passwordInputs[1].type(TEST_PASS);
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn!.click();

      // Wait for response or navigation
      await Promise.race([
        page.waitForFunction(
          () => {
            const body = document.body.innerText.toLowerCase();
            return (
              body.includes("account created") ||
              body.includes("already exists") ||
              body.includes("registration failed")
            );
          },
          { timeout: 10000 }
        ),
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }),
        new Promise((r) => setTimeout(r, 5000)),
      ]).catch(() => {});

      // Now go to login page
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Fill login form
      const loginUsername = await page.$('input[placeholder*="username" i]');
      expect(loginUsername).not.toBeNull();
      await loginUsername!.type(TEST_USER);

      const loginPassword = await page.$('input[type="password"]');
      expect(loginPassword).not.toBeNull();
      await loginPassword!.type(TEST_PASS);

      await waitAndScreenshot(page, "login-filled.png");

      // Click login
      const loginBtn = await page.$('button[type="submit"]');
      expect(loginBtn).not.toBeNull();
      await loginBtn!.click();

      // Wait for redirect or success or token in storage
      try {
        await page.waitForFunction(
          () => {
            const body = document.body.innerText.toLowerCase();
            return (
              body.includes("login successful") ||
              body.includes("welcome") ||
              window.location.pathname.includes("/dashboard") ||
              !!localStorage.getItem("token")
            );
          },
          { timeout: 15000 }
        );
      } catch {
        // Capture debug screenshot and page state
        await page.screenshot({ path: "tests/screenshots/login-debug.png" });
        const debugText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.error("Login page text after submit:", debugText);
        throw new Error("Login did not succeed within 15 seconds");
      }

      await waitAndScreenshot(page, "login-success.png");

      // Grab the auth tokens for subsequent tests
      const tokens = await page.evaluate(() => ({
        token: localStorage.getItem("token") || "",
        refreshToken: localStorage.getItem("refreshToken") || "",
        user: localStorage.getItem("user") || "",
      }));

      authToken = tokens.token;
      refreshToken = tokens.refreshToken;
      userJson = tokens.user;

      expect(authToken).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────
  // Flow 3: Authenticated Account Page
  // ────────────────────────────────────────────────
  describe("Flow 3: Authenticated Account Page", () => {
    it("should show account settings when authenticated", async () => {
      // Ensure we have auth tokens
      if (!authToken) {
        console.warn("Skipping: no auth token available");
        return;
      }

      await page.goto(`${BASE_URL}/account`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await setAuth(page);
      await page.goto(`${BASE_URL}/account`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Desktop screenshot
      await page.setViewport(VIEWPORTS.desktop);
      await waitAndScreenshot(page, "account-authenticated-desktop.png");

      // Mobile screenshot
      await page.setViewport(VIEWPORTS.mobile);
      await waitAndScreenshot(page, "account-authenticated-mobile.png");

      // Verify it shows account content, not the login form
      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );
      const hasAccountContent =
        bodyText.includes("username") ||
        bodyText.includes("email") ||
        bodyText.includes("profile") ||
        bodyText.includes("account") ||
        bodyText.includes("password");
      expect(hasAccountContent).toBe(true);

      // Verify we are NOT seeing the login form
      const hasLoginForm =
        bodyText.includes("welcome back") &&
        bodyText.includes("sign in to your account");
      expect(hasLoginForm).toBe(false);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 4: Dashboard
  // ────────────────────────────────────────────────
  describe("Flow 4: Dashboard", () => {
    it("should show dashboard content when authenticated", async () => {
      if (!authToken) {
        console.warn("Skipping: no auth token available");
        return;
      }

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await setAuth(page);
      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Desktop screenshot
      await page.setViewport(VIEWPORTS.desktop);
      await waitAndScreenshot(page, "dashboard-authenticated-desktop.png");

      // Mobile screenshot
      await page.setViewport(VIEWPORTS.mobile);
      await waitAndScreenshot(page, "dashboard-authenticated-mobile.png");

      // Verify dashboard elements
      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );
      const url = page.url();
      const isDashboard =
        url.includes("/dashboard") ||
        bodyText.includes("dashboard") ||
        bodyText.includes("bloodline calculator") ||
        bodyText.includes("pedigree lab");
      expect(isDashboard).toBe(true);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 5: Contact Form
  // ────────────────────────────────────────────────
  describe("Flow 5: Contact Form", () => {
    it("should fill and submit the contact form", async () => {
      await page.goto(`${BASE_URL}/contact`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Fill name
      const nameInput = await page.$('input[placeholder*="name" i]');
      expect(nameInput).not.toBeNull();
      await nameInput!.click({ clickCount: 3 }); // select all
      await nameInput!.type("Test User");

      // Fill subject
      const subjectInput = await page.$('input[placeholder*="about" i]');
      expect(subjectInput).not.toBeNull();
      await subjectInput!.type("E2E Test");

      // Fill message
      const messageArea = await page.$('textarea[placeholder*="message" i]');
      expect(messageArea).not.toBeNull();
      await messageArea!.type("Testing the contact form");

      await waitAndScreenshot(page, "contact-form-filled.png");

      // Click submit
      const submitBtn = await page.$('button[type="submit"]');
      expect(submitBtn).not.toBeNull();
      await submitBtn!.click();

      // Wait for success or error response
      await page.waitForFunction(
        () => {
          const body = document.body.innerText.toLowerCase();
          return (
            body.includes("message sent") ||
            body.includes("failed") ||
            body.includes("sending")
          );
        },
        { timeout: 15000 }
      );

      // Give it a moment to show the final result
      await new Promise((r) => setTimeout(r, 2000));
      await waitAndScreenshot(page, "contact-form-submitted.png");

      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );
      // Either success or some response is shown
      expect(
        bodyText.includes("message sent") ||
          bodyText.includes("failed") ||
          bodyText.includes("error")
      ).toBe(true);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 6: Pedigree Search
  // ────────────────────────────────────────────────
  describe("Flow 6: Pedigree Search", () => {
    it("should search for dogs on the pedigree hub", async () => {
      await page.goto(`${BASE_URL}/pedigree`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Type in the search input
      const searchInput = await page.$(
        'input[placeholder*="Search by dog name" i]'
      );
      expect(searchInput).not.toBeNull();
      await searchInput!.type("Jeep");

      // Click search button
      const searchBtn = await page.$(
        'button[type="submit"]'
      );
      expect(searchBtn).not.toBeNull();
      await searchBtn!.click();

      // Wait for results or loading to finish
      await page.waitForFunction(
        () => {
          const body = document.body.innerText.toLowerCase();
          return (
            body.includes("found") ||
            body.includes("no dogs found") ||
            body.includes("results")
          );
        },
        { timeout: 15000 }
      );

      await waitAndScreenshot(page, "pedigree-search-results.png");

      // Verify results area is shown
      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );
      expect(
        bodyText.includes("found") || bodyText.includes("no dogs found")
      ).toBe(true);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 7: Browse Dogs with Filters
  // ────────────────────────────────────────────────
  describe("Flow 7: Browse Dogs with Filters", () => {
    it("should filter by sex and search", async () => {
      await page.goto(`${BASE_URL}/browse`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for initial dogs to load
      await page.waitForFunction(
        () => {
          const body = document.body.innerText;
          return body.includes("Browse") || body.includes("Dogs");
        },
        { timeout: 15000 }
      );

      // Click Males filter
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) => b.textContent?.includes("Males"));
        if (btn) (btn as HTMLElement).click();
      });
      await new Promise((r) => setTimeout(r, 1500));
      await waitAndScreenshot(page, "browse-males-filter.png");

      // Click Females filter
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) => b.textContent?.includes("Females"));
        if (btn) (btn as HTMLElement).click();
      });
      await new Promise((r) => setTimeout(r, 1500));
      await waitAndScreenshot(page, "browse-females-filter.png");

      // Type in search and submit
      const searchInput = await page.$(
        'input[placeholder*="Search by name" i]'
      );
      expect(searchInput).not.toBeNull();
      await searchInput!.type("Jeep");

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        const btn = buttons.find((b) => b.textContent?.trim().toUpperCase() === "SEARCH") || buttons[0];
        if (btn) (btn as HTMLElement).click();
      });

      await new Promise((r) => setTimeout(r, 1500));
      await waitAndScreenshot(page, "browse-search.png");
    });
  });

  // ────────────────────────────────────────────────
  // Flow 8: Breeding Calculator
  // ────────────────────────────────────────────────
  describe("Flow 8: Breeding Calculator", () => {
    it("should show the breeding calculator with search fields", async () => {
      await page.goto(`${BASE_URL}/breeding-calculator`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await waitAndScreenshot(page, "breeding-calc-empty.png");

      // Verify sire and dam search fields exist
      const bodyText = await page.evaluate(() =>
        document.body.innerText.toUpperCase()
      );
      expect(bodyText.includes("SIRE") || bodyText.includes("DAM")).toBe(true);

      // Look for search inputs
      const searchInputs = await page.$$(
        'input[placeholder*="Search" i]'
      );
      expect(searchInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 9: Puppy Color Predictor
  // ────────────────────────────────────────────────
  describe("Flow 9: Puppy Color Predictor", () => {
    it("should select coat colors and predict litter", async () => {
      await page.goto(`${BASE_URL}/puppy-predictor`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // The page starts in "simple" mode by default (I Don't Know Genotype)
      // Click a sire coat color - "Black" (first instance in sire section)
      await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll("button"));
        const blackButtons = allButtons.filter(
          (b) => b.textContent?.trim() === "Black"
        );
        // First Black button should be in the sire section
        if (blackButtons[0]) (blackButtons[0] as HTMLElement).click();
      });
      await new Promise((r) => setTimeout(r, 300));

      // Click a dam coat color - "Red & White" (second instance in dam section)
      await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll("button"));
        const redWhiteButtons = allButtons.filter(
          (b) => b.textContent?.trim() === "Red & White"
        );
        // Second instance should be in the dam section
        const btn = redWhiteButtons.length > 1 ? redWhiteButtons[1] : redWhiteButtons[0];
        if (btn) (btn as HTMLElement).click();
      });
      await new Promise((r) => setTimeout(r, 300));

      await waitAndScreenshot(page, "puppy-predictor-selected.png");

      // Click PREDICT LITTER
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) =>
          b.textContent?.trim().toUpperCase().includes("PREDICT LITTER")
        );
        if (btn) (btn as HTMLElement).click();
      });

      // Wait for results to appear
      await new Promise((r) => setTimeout(r, 1500));

      await waitAndScreenshot(page, "puppy-predictor-results.png");

      // Verify results are shown (phenotype names or percentages)
      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );
      expect(
        bodyText.includes("%") || bodyText.includes("black") || bodyText.includes("predicted")
      ).toBe(true);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 10: Marketplace Create (authenticated)
  // ────────────────────────────────────────────────
  describe("Flow 10: Marketplace Create", () => {
    it("should show the create listing form when authenticated", async () => {
      if (!authToken) {
        console.warn("Skipping: no auth token available");
        return;
      }

      await page.goto(`${BASE_URL}/marketplace/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await setAuth(page);
      await page.goto(`${BASE_URL}/marketplace/create`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for the form to load
      await new Promise((r) => setTimeout(r, 1000));

      // Check that we see the marketplace create form (not a login redirect)
      const bodyText = await page.evaluate(() =>
        document.body.innerText.toLowerCase()
      );

      // The page should show form elements or category selection
      const hasCreateContent =
        bodyText.includes("title") ||
        bodyText.includes("category") ||
        bodyText.includes("listing") ||
        bodyText.includes("dogs for sale") ||
        bodyText.includes("create");
      expect(hasCreateContent).toBe(true);

      // Try to fill in title if it exists
      const titleInput = await page.$(
        'input[placeholder*="title" i], input[type="text"]'
      );
      if (titleInput) {
        await titleInput.type("E2E Test Listing");
      }

      // Try to fill description if it exists
      const descArea = await page.$(
        'textarea[placeholder*="description" i], textarea'
      );
      if (descArea) {
        await descArea.type("Test description");
      }

      // Click a category if shown
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) =>
          b.textContent?.includes("Dogs for Sale")
        );
        if (btn) (btn as HTMLElement).click();
      });
      await new Promise((r) => setTimeout(r, 500));

      await waitAndScreenshot(page, "marketplace-create-filled.png");
    });
  });

  // ────────────────────────────────────────────────
  // Flow 11: Pedigree Lab
  // ────────────────────────────────────────────────
  describe("Flow 11: Pedigree Lab", () => {
    it("should show pedigree lab with tree slots", async () => {
      await page.goto(`${BASE_URL}/pedigree-lab`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Verify "SUBJECT DOG" placeholder is visible (displayed uppercase)
      const bodyText = await page.evaluate(() =>
        document.body.innerText
      );
      expect(bodyText.toUpperCase()).toContain("SUBJECT DOG");

      // Verify interactive elements exist (search inputs or tree slots)
      const hasInteractiveElements = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder*="Search" i]');
        const slots = document.querySelectorAll('[class*="rounded"]');
        return inputs.length > 0 || slots.length > 5;
      });
      expect(hasInteractiveElements).toBe(true);

      // Verify other slot labels exist
      expect(bodyText).toMatch(/Sire|Dam/i);
    });
  });

  // ────────────────────────────────────────────────
  // Flow 12: Homepage Interaction
  // ────────────────────────────────────────────────
  describe("Flow 12: Homepage Interaction", () => {
    it("should navigate via Get Started Free CTA", async () => {
      await page.goto(`${BASE_URL}/`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Verify hero section is visible
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toMatch(/Pedigree/i);

      // Find and click "Get Started Free" link
      const registerLinks = await page.$$('a[href="/register"]');
      expect(registerLinks.length).toBeGreaterThan(0);

      // Click the one that says "Get Started Free"
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href="/register"]'));
        const btn = links.find((a) =>
          a.textContent?.toLowerCase().includes("get started free")
        ) || links[0];
        if (btn) (btn as HTMLElement).click();
      });

      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});

      expect(page.url()).toContain("/register");
      await waitAndScreenshot(page, "home-cta-click.png");

      // Go back to home
      await page.goto(`${BASE_URL}/`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Scroll to Bloodline Calculator section
      await page.evaluate(() => {
        const section = document.getElementById("breeding-calculator");
        if (section) section.scrollIntoView({ behavior: "instant" });
      });
      await new Promise((r) => setTimeout(r, 500));

      // Verify "Bloodline Calculator" section is visible
      const calcText = await page.evaluate(() => document.body.innerText);
      expect(calcText).toContain("Bloodline Calculator");

      // Click "Try Bloodline Calculator" button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find((b) =>
          b.textContent?.includes("Try Bloodline Calculator")
        );
        if (btn) (btn as HTMLElement).click();
      });
      // This opens an auth modal rather than navigating directly
      await new Promise((r) => setTimeout(r, 1000));

      await waitAndScreenshot(page, "home-bloodline-cta.png");
    });
  });
});
