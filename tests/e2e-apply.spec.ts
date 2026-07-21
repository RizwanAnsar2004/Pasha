// End-to-end browser tests for the v2 (3-step) apply form.
import { test, expect } from "@playwright/test";

const DESCRIPTION_50_PLUS =
  "Testing the P@SHA apply form end-to-end via Playwright. This description is comfortably above the 50-character minimum.";

test.describe("Apply v2 — happy path", () => {
  test("can complete a minimum-required 3-step submission", async ({ page }) => {
    const stamp = Date.now();
    const uniqueEmail = `playwright+${stamp}@example.com`;

    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {}
    });
    await page.goto("/apply");

    // ---- Step 1: Startup
    await expect(page.getByRole("heading", { name: /^Startup$/ })).toBeVisible();

    // Basics
    await page.getByPlaceholder("e.g. BearPlex").fill(`PW-Test ${stamp}`);
    await page.getByPlaceholder("https://yourstartup.com").fill("https://example.com");
    await page.getByPlaceholder("2022").fill("2024");
    await page.getByPlaceholder("We build an AI-powered platform that helps…").fill(
      DESCRIPTION_50_PLUS
    );

    // Location — default branch (in Pakistan). Pick a city.
    await page.getByLabel("HQ city").selectOption("Lahore");

    // Category — pick sector + stage (both required).
    await page.getByLabel("Primary sector").selectOption("Artificial Intelligence (AI)");
    await page.getByLabel("Current stage").selectOption("growth");

    await page.getByRole("button", { name: /^Continue$/ }).click();

    // ---- Step 2: Founders
    await expect(page.getByRole("heading", { name: /^Founders$/ })).toBeVisible();
    await page.getByPlaceholder("e.g. Hamad Pervaiz").first().fill("Playwright Founder");
    await page.getByPlaceholder("e.g. CEO").first().fill("CEO");
    await page.getByPlaceholder("founder@startup.com").first().fill(uniqueEmail);
    await page.getByPlaceholder("+92 300 1234567").first().fill("03001234567");
    await page.getByRole("button", { name: /^Continue$/ }).click();

    // ---- Step 3: Recognition & Community
    await expect(page.getByRole("heading", { name: /^Recognition$/ })).toBeVisible();
    await page.waitForTimeout(300);

    // Submit
    await Promise.all([
      page.waitForURL(/\/apply\/success\?/, { timeout: 30_000 }),
      page.getByRole("button", { name: /Submit application/i }).click(),
    ]);
    await expect(page.getByText(/You're in the queue/i)).toBeVisible();
  });
});

test.describe("Apply v2 — error path", () => {
  test("Continue from step 1 with missing required fields stays on step 1", async ({ page }) => {
    await page.goto("/apply");
    await page.getByRole("button", { name: /^Continue$/ }).click();
    // Still on step 1 — the startup_name input must still be visible.
    await expect(page.getByPlaceholder("e.g. BearPlex")).toBeVisible();
    // Error banner mentions Step 1 (Startup).
    const errorBanner = page.locator("text=/Step 1.*Startup.*needs/i");
    await expect(errorBanner).toBeVisible();
  });

  test("invalid website on step 1 stays on step 1", async ({ page }) => {
    await page.goto("/apply");
    await page.getByPlaceholder("e.g. BearPlex").fill("Whatever");
    await page.getByPlaceholder("https://yourstartup.com").fill("not-a-url");
    await page.getByPlaceholder("2022").fill("2024");
    await page.getByPlaceholder("We build an AI-powered platform that helps…").fill(
      DESCRIPTION_50_PLUS
    );
    await page.getByLabel("HQ city").selectOption("Lahore");
    await page.getByLabel("Primary sector").selectOption("Fintech");
    await page.getByLabel("Current stage").selectOption("early");
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await expect(page.getByPlaceholder("e.g. BearPlex")).toBeVisible();
    const errorBanner = page.locator("text=/Step 1.*Startup.*needs/i");
    await expect(errorBanner).toBeVisible();
  });
});

test.describe("Apply v2 — autosave", () => {
  test("draft restoration banner appears on reload", async ({ page }) => {
    await page.goto("/apply");
    const uniqueName = `Autosave PW ${Date.now()}`;
    await page.getByPlaceholder("e.g. BearPlex").fill(uniqueName);
    await page.waitForTimeout(1500); // debounced autosave 1s

    await page.reload();
    await expect(page.getByText(/Your previous draft has been restored/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByPlaceholder("e.g. BearPlex")).toHaveValue(uniqueName);
  });

  test("draft key is the v2 key", async ({ page }) => {
    await page.goto("/apply");
    await page.getByPlaceholder("e.g. BearPlex").fill("Key Check");
    await page.waitForTimeout(1500);
    const key = await page.evaluate(() =>
      Object.keys(window.localStorage).find((k) => k.startsWith("pasha-apply-draft"))
    );
    expect(key).toBe("pasha-apply-draft-v2");
  });
});

test.describe("Apply v2 — regression: no auto-submit", () => {
  test("arriving at step 3 + clicking community Yes/No does NOT submit", async ({ page }) => {
    const stamp = Date.now();
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {}
    });
    await page.goto("/apply");

    // Walk through step 1 → 2 → 3
    await page.getByPlaceholder("e.g. BearPlex").fill(`AutoSubmit-Repro ${stamp}`);
    await page.getByPlaceholder("https://yourstartup.com").fill("https://example.com");
    await page.getByPlaceholder("2022").fill("2024");
    await page.getByPlaceholder("We build an AI-powered platform that helps…").fill(
      DESCRIPTION_50_PLUS
    );
    await page.getByLabel("HQ city").selectOption("Lahore");
    await page.getByLabel("Primary sector").selectOption("Fintech");
    await page.getByLabel("Current stage").selectOption("early");
    await page.getByRole("button", { name: /^Continue$/ }).click();

    await expect(page.getByRole("heading", { name: /^Founders$/ })).toBeVisible();
    await page.getByPlaceholder("e.g. Hamad Pervaiz").first().fill("No-Autosubmit");
    await page.getByPlaceholder("e.g. CEO").first().fill("CEO");
    await page.getByPlaceholder("founder@startup.com").first().fill(`no-auto+${stamp}@example.com`);
    await page.getByPlaceholder("+92 300 1234567").first().fill("03001234567");
    await page.getByRole("button", { name: /^Continue$/ }).click();

    await expect(page.getByRole("heading", { name: /^Recognition$/ })).toBeVisible();
    await page.waitForTimeout(400);

    // Should NOT be on /apply/success yet.
    expect(page.url()).not.toMatch(/\/apply\/success/);

    // Click the community Yes/No radios — must not submit.
    await page.getByRole("radio", { name: /^Yes$/ }).first().click();
    await page.waitForTimeout(300);
    expect(page.url()).not.toMatch(/\/apply\/success/);

    // Type into closing notes + press Enter — must not submit.
    await page.getByPlaceholder("Optional — share anything").focus();
    await page.keyboard.type("Just a note.");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    expect(page.url()).not.toMatch(/\/apply\/success/);

    // Now explicitly submit.
    await Promise.all([
      page.waitForURL(/\/apply\/success\?/, { timeout: 20_000 }),
      page.getByRole("button", { name: /Submit application/i }).click(),
    ]);
  });
});
