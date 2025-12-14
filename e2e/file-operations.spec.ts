import { test, expect } from '@playwright/test';

/**
 * File Operation Tests
 * Tests saving, loading, and file handling
 */

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('file: create, edit, and save document', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Make an edit
    const input = page.locator('input[type="number"]').first();
    if (await input.isVisible()) {
      await input.fill('5');
    }

    // Verify dirty
    let title = await page.title();
    expect(title).toContain('•');

    // Save
    await page.keyboard.press('Control+S');

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Verify clean
    title = await page.title();
    expect(title).not.toContain('•');
  });

  test('file: unsaved changes warning', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Make an edit
    const input = page.locator('input[type="number"]').first();
    if (await input.isVisible()) {
      await input.fill('5');
    }

    // Try to close without saving (would normally show warning)
    // Since we can't actually close, we'll just verify dirty state
    const title = await page.title();
    expect(title).toContain('•');
  });

  test('file: undo to clean state after edits', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Make edits
    const input = page.locator('input[type="number"]').first();
    for (let i = 0; i < 5; i++) {
      if (await input.isVisible()) {
        await input.fill((i + 1).toString());
      }
      await page.keyboard.press('Tab');
      await page.waitForTimeout(10);
    }

    // Should be dirty
    let title = await page.title();
    expect(title).toContain('•');

    // Undo all edits
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Z');
      await page.waitForTimeout(10);
    }

    // Should be clean
    title = await page.title();
    expect(title).not.toContain('•');
  });
});
