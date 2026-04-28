import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Rival blog page UI and UX audit', () => {
  test('renders the article page without critical accessibility violations', async ({ page }, testInfo) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'How to evaluate insight community solutions before you buy',
    );
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect(page.getByRole('article')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);

    await testInfo.attach('page-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });

  test('keeps content within the viewport on narrow screens', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('opens and closes the mobile navigation with keyboard-operable state', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Menu' });

    if (await menuButton.isVisible()) {
      await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      await menuButton.click();
      await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      await expect(
        page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Platform' }),
      ).toBeVisible();
    }
  });
});
