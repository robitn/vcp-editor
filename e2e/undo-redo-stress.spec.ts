import { test, expect } from '@playwright/test';

/**
 * Stress Tests: Undo/Redo System
 * Tests rapid, repetitive actions that stress the undo/redo stack
 */

test.describe('Stress Tests - Undo/Redo System', () => {
  test.beforeEach(async ({ page }) => {
    // Start with fresh app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('stress: 100 rapid edits and undo all', async ({ page }) => {
    // Wait for grid to be ready
    await page.waitForSelector('.grid-container', { timeout: 5000 });
    
    // Get initial title
    const initialTitle = await page.title();
    expect(initialTitle).toContain('Untitled');

    // Click on first grid cell and make 100 edits
    for (let i = 0; i < 100; i++) {
      // Simulate border property change
      const rowInput = page.locator('input[type="number"]').first();
      if (await rowInput.isVisible()) {
        await rowInput.fill((i + 1).toString());
      }
      await page.keyboard.press('Tab');
    }

    // Window title should show dirty indicator (•)
    let title = await page.title();
    expect(title).toContain('•');

    // Undo all 100 edits
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Control+Z');
      await page.waitForTimeout(5); // Small delay to let state update
    }

    // After undoing all, title should not have dirty indicator
    title = await page.title();
    expect(title).not.toContain('•');
  });

  test('stress: 50 undo/redo cycles', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Make one edit
    const input = page.locator('input[type="number"]').first();
    if (await input.isVisible()) {
      await input.fill('5');
    }

    // Verify dirty
    let title = await page.title();
    expect(title).toContain('•');

    // Rapid undo/redo cycles
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Control+Z'); // Undo
      await page.waitForTimeout(5);
      await page.keyboard.press('Control+Y'); // Redo
      await page.waitForTimeout(5);
    }

    // Should still be dirty (last operation was redo)
    title = await page.title();
    expect(title).toContain('•');
  });

  test('stress: undo at max history limit (5 items)', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    const input = page.locator('input[type="number"]').first();

    // Make 10 edits (exceeding 5-item history)
    for (let i = 0; i < 10; i++) {
      if (await input.isVisible()) {
        await input.fill((i + 1).toString());
      }
      await page.keyboard.press('Tab');
      await page.waitForTimeout(10);
    }

    // Verify dirty
    let title = await page.title();
    expect(title).toContain('•');

    // Try to undo more than 5 times (should stop at 5)
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Control+Z');
      await page.waitForTimeout(5);
    }

    // Should be clean after undoing 5 items
    title = await page.title();
    expect(title).not.toContain('•');
  });

  test('stress: edit, undo, edit again', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    const input = page.locator('input[type="number"]').first();

    // Edit 1
    await input.fill('1');
    await page.keyboard.press('Tab');
    let title = await page.title();
    expect(title).toContain('•');

    // Undo
    await page.keyboard.press('Control+Z');
    title = await page.title();
    expect(title).not.toContain('•');

    // Edit 2 (should clear redo stack)
    await input.fill('2');
    await page.keyboard.press('Tab');
    title = await page.title();
    expect(title).toContain('•');

    // Redo should not work
    await page.keyboard.press('Control+Y');
    await page.keyboard.press('Control+Y');
    
    // Still dirty from the edit
    title = await page.title();
    expect(title).toContain('•');
  });

  test('stress: continuous edits without save for 50 iterations', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Make rapid edits
    for (let i = 0; i < 50; i++) {
      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();
      if (count > 0) {
        await inputs.first().fill(i.toString());
      }
      await page.waitForTimeout(5);
    }

    // Should be dirty
    const title = await page.title();
    expect(title).toContain('•');
  });
});
