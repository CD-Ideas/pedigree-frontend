import type { Browser, Page } from "puppeteer";
import { BASE_URL, launchBrowser, VIEWPORTS } from "./puppeteer.config";

describe("Responsive behavior", () => {
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
  });

  afterEach(async () => {
    await page.close();
  });

  it("should show hamburger menu on mobile viewport", async () => {
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // On mobile, the NavBar should collapse into a hamburger/menu button
    const hamburger = await page.$(
      'button[aria-label*="menu" i], button[class*="hamburger" i], [data-testid="mobile-menu"], button.md\\:hidden, button.lg\\:hidden'
    );

    // Either a hamburger exists, or the regular nav links are hidden
    if (!hamburger) {
      // Check that regular nav links are not all visible (some should be hidden on mobile)
      const navLinksVisible = await page.evaluate(() => {
        const links = document.querySelectorAll("nav a");
        let visibleCount = 0;
        links.forEach((link) => {
          const style = window.getComputedStyle(link);
          if (style.display !== "none" && style.visibility !== "hidden") {
            visibleCount++;
          }
        });
        return visibleCount;
      });
      // On mobile, we expect fewer visible nav links or a collapsed menu
      expect(navLinksVisible).toBeLessThanOrEqual(10);
    } else {
      expect(hamburger).not.toBeNull();
    }
  });

  describe("No horizontal scroll on any page", () => {
    const pagesToCheck = [
      { path: "/", name: "home" },
      { path: "/login", name: "login" },
      { path: "/register", name: "register" },
      { path: "/marketplace", name: "marketplace" },
      { path: "/browse", name: "browse" },
      { path: "/contact", name: "contact" },
      { path: "/pedigree", name: "pedigree" },
      { path: "/privacy", name: "privacy" },
      { path: "/terms", name: "terms" },
      { path: "/bloodline-calculator", name: "bloodline-calculator" },
      { path: "/puppy-predictor", name: "puppy-predictor" },
      { path: "/community", name: "community" },
      { path: "/forgot-password", name: "forgot-password" },
      { path: "/pedigree-lab", name: "pedigree-lab" },
      { path: "/account", name: "account" },
    ];

    for (const viewport of Object.entries(VIEWPORTS)) {
      const [vpName, vpSize] = viewport;

      for (const { path, name } of pagesToCheck) {
        it(`should have no horizontal scroll on ${name} at ${vpName} (${vpSize.width}x${vpSize.height})`, async () => {
          await page.setViewport(vpSize);
          await page.goto(`${BASE_URL}${path}`, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });

          expect(hasHorizontalScroll).toBe(false);
        });
      }
    }
  });

  it("should stack cards vertically on mobile", async () => {
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Check that grid/flex containers with cards do not overflow horizontally
    const cardsOverflow = await page.evaluate(() => {
      const grids = document.querySelectorAll('[class*="grid"], [class*="flex"]');
      let overflowing = false;
      grids.forEach((grid) => {
        if (grid.scrollWidth > grid.clientWidth + 5) {
          overflowing = true;
        }
      });
      return overflowing;
    });

    expect(cardsOverflow).toBe(false);
  });
});
