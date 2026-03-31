import puppeteer from "puppeteer";

export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
} as const;

export async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function screenshotAtBreakpoints(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>,
  pageName: string,
  screenshotDir = "tests/screenshots"
) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewport(viewport);
    // Allow layout to settle after viewport change
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({
      path: `${screenshotDir}/${pageName}-${name}.png`,
      fullPage: true,
    });
  }
}
