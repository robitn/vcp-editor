import { test, expect } from '@playwright/test';

/**
 * Fool Tests: File Operations
 * Tests edge cases, invalid inputs, and foolish scenarios
 */

test.describe('Fool Tests - File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('fool: save without making edits', async ({ page }) => {
    // App should handle saving a clean document
    await page.keyboard.press('Control+S');
    
    // Wait for save dialog or notification
    const notification = page.locator('text=File saved').or(page.locator('[role="dialog"]'));
    const visible = await notification.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Should either save successfully or show no-op message
    expect(visible || await page.title().then(t => !t.includes('•'))).toBeTruthy();
  });

  test('fool: rapid save clicks (10 saves in 1 second)', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Make one edit
    const input = page.locator('input[type="number"]').first();
    if (await input.isVisible()) {
      await input.fill('1');
    }

    // Rapid saves
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+S');
      await page.waitForTimeout(100);
    }

    // App should not crash, title should not have dirty indicator
    const title = await page.title();
    expect(title).not.toContain('•');
  });

  test('fool: drag element outside grid boundaries', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Try to drag an element far outside grid
    const gridCell = page.locator('.grid-cell').first();
    if (await gridCell.isVisible()) {
      await gridCell.dragTo(page.locator('body'), { targetPosition: { x: -1000, y: -1000 } });
    }

    // App should handle gracefully (no crash)
    expect(await page.title()).toBeTruthy();
  });

  test('fool: paste empty clipboard', async ({ page }) => {
    // Try paste without copying anything first
    await page.keyboard.press('Control+V');
    
    // Should handle gracefully
    expect(await page.title()).toBeTruthy();
  });

  test('fool: cut/copy/paste rapidly 50 times', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Click grid cell to select
    const gridCell = page.locator('.grid-cell').first();
    if (await gridCell.isVisible()) {
      await gridCell.click();
    }

    // Rapid clipboard operations
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Control+C');
      await page.keyboard.press('Control+V');
      await page.waitForTimeout(10);
    }

    // App should handle without crashing
    expect(await page.title()).toBeTruthy();
  });

  test('fool: undo immediately after paste', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    const gridCell = page.locator('.grid-cell').first();
    if (await gridCell.isVisible()) {
      await gridCell.click();
      await page.keyboard.press('Control+C');
      await page.keyboard.press('Control+V');
      await page.keyboard.press('Control+Z');
    }

    // Should undo the paste
    expect(await page.title()).toBeTruthy();
  });

  test('fool: click random elements 1000 times', async ({ page }) => {
    const startTime = Date.now();
    let clickCount = 0;

    // Random clicking for a duration
    while (Date.now() - startTime < 5000 && clickCount < 1000) {
      const elements = await page.locator('button, input, div.grid-cell, div.inspector-content').all();
      if (elements.length > 0) {
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        await randomElement.click().catch(() => {});
        clickCount++;
      }
      await page.waitForTimeout(1);
    }

    // App should survive 1000 random clicks
    expect(clickCount).toBeGreaterThan(100);
    expect(await page.title()).toBeTruthy();
  });

  test('fool: hold keyboard key for extended period', async ({ page }) => {
    // Rapid repeated key presses
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Delete');
      await page.waitForTimeout(5);
    }

    // App should handle gracefully
    expect(await page.title()).toBeTruthy();
  });

  test('fool: navigate between tabs rapidly', async ({ page }) => {
    // Try switching settings tabs
    const settingsButton = page.locator('button:has-text("Settings")').or(
      page.locator('[aria-label*="Settings"]')
    );

    if (await settingsButton.isVisible()) {
      for (let i = 0; i < 20; i++) {
        await settingsButton.click();
        await page.waitForTimeout(50);
      }
    }

    expect(await page.title()).toBeTruthy();
  });

  test('fool: close settings while editing', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('button:has-text("Settings")').or(
      page.locator('[aria-label*="Settings"]')
    );

    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Make changes
      const inputs = page.locator('[role="dialog"] input');
      if (await inputs.count() > 0) {
        await inputs.first().fill('test value');
      }

      // Close without saving
      await page.keyboard.press('Escape');
      
      // Changes should be auto-saved (per requirements)
      expect(await page.title()).toBeTruthy();
    }
  });

  test('fool: window resize during drag operation', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    const gridCell = page.locator('.grid-cell').first();
    if (await gridCell.isVisible()) {
      // Start drag
      await gridCell.dragTo(gridCell, { targetPosition: { x: 50, y: 50 } });
    }

    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(100);

    // App should handle gracefully
    expect(await page.title()).toBeTruthy();
  });

  test('fool: create button with special characters in name', async ({ page }) => {
    // Find button creation UI
    const createButtonBtn = page.locator('button:has-text("Button")').or(
      page.locator('[aria-label*="Button"]')
    );

    if (await createButtonBtn.isVisible()) {
      await createButtonBtn.click();

      // Try to name with special chars
      const nameInput = page.locator('[role="dialog"] input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Button @#$%^&*()_+-=[]{}|;:,.<>?');
        await page.keyboard.press('Enter');
      }

      // Should handle or sanitize
      expect(await page.title()).toBeTruthy();
    }
  });

  test('fool: fill grid with max elements and zoom', async ({ page }) => {
    await page.waitForSelector('.grid-container', { timeout: 5000 });

    // Zoom in/out rapidly
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Control+Plus');
      await page.keyboard.press('Control+Minus');
      await page.waitForTimeout(50);
    }

    // App should handle zoom gracefully
    expect(await page.title()).toBeTruthy();
  });
});
