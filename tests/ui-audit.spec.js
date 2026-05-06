import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Design QA dashboard deployment audit', () => {
  test('renders the dashboard without critical accessibility violations', async ({ page }, testInfo) => {
    await page.goto('/dashboard.html');

    await expect(page).toHaveTitle('Design QA Cockpit');
    await expect(page.locator('.brand-text b')).toHaveText('Design QA');
    await expect(page.locator('button[data-view="qa"]')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);

    await testInfo.attach('page-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });

  test('keeps dashboard content within the viewport on narrow screens', async ({ page }) => {
    await page.goto('/dashboard.html');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('serves required comparison inputs and QA docs dataset', async ({ page }) => {
    await page.goto('/dashboard.html');

    await expect(page).toHaveTitle('Design QA Cockpit');
    await expect(page.locator('.brand-text b')).toHaveText('Design QA');

    await page.locator('button[data-view="qa"]').click();

    await expect(page.locator('#qa-figma')).toHaveValue(/figma\.com\/design/);
    await expect(page.locator('#qa-page')).toHaveValue(/127\.0\.0\.1:4173/);
    await expect(page.locator('#qa-btn')).toBeVisible();

    await page.locator('button[data-view="docs"]').click();
    await expect(page.locator('#md-count')).not.toHaveText('0');
    await expect(page.locator('#md-preview')).toContainText('QA');
  });
});
