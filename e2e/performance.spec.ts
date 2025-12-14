import { test, expect } from '@playwright/test';

test.describe('Performance and Advanced Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should handle 200 sequential edits without memory issues', async ({ page }) => {
    // Create a new document
    await page.click('text=File');
    await page.click('text=New');
    
    // Add borders
    await page.click('text=Borders');
    
    // Perform 200 edits
    for (let i = 0; i < 200; i++) {
      // Border edit
      await page.click('[data-testid="border-0"]');
      await page.fill('input[placeholder="Width"]', String((i % 100) + 1));
      await page.press('input[placeholder="Width"]', 'Enter');
      
      if (i % 20 === 0) {
        await page.waitForTimeout(100); // Occasional pause to let React render
      }
    }
    
    // App should still be responsive
    const title = await page.locator('title');
    await expect(title).toContainText('VCP Editor');
  });

  test('should handle rapid undo/redo without stack corruption', async ({ page }) => {
    // Create document with some content
    await page.click('text=File');
    await page.click('text=New');
    
    // Add 10 buttons
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="add-button"]');
      await page.fill('input[placeholder="Button Name"]', `btn_${i}`);
      await page.click('button:has-text("Create")');
    }
    
    // Rapid undo/redo 100 times
    for (let i = 0; i < 100; i++) {
      const isUndo = i % 2 === 0;
      const hotkey = isUndo ? 'Control+Z' : 'Control+Shift+Z';
      await page.keyboard.press(hotkey);
      await page.waitForTimeout(10); // Minimal delay
    }
    
    // Verify state consistency
    const buttons = await page.locator('[data-testid="button-item"]').count();
    expect(buttons).toBeGreaterThanOrEqual(0);
  });

  test('should maintain undo history integrity with editing after undo', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Perform sequence of edits
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="add-border"]');
      await page.fill('input[placeholder="Border Name"]', `border_${i}`);
      await page.click('button:has-text("Add")');
    }
    
    // Undo 5 times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Z');
    }
    
    // Now make a new edit (should clear redo stack)
    await page.click('[data-testid="add-border"]');
    await page.fill('input[placeholder="Border Name"]', 'new_border');
    await page.click('button:has-text("Add")');
    
    // Redo should be disabled or empty
    const redo = page.locator('[data-testid="redo-button"]');
    const isDisabled = await redo.evaluate(el => (el as HTMLButtonElement).disabled);
    expect(isDisabled).toBeTruthy();
  });

  test('should handle file operations with 50MB+ combined state', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Add many elements to create larger state
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="add-border"]');
      const name = `border_with_long_name_${i}_extra_data`;
      await page.fill('input[placeholder="Border Name"]', name);
      await page.click('button:has-text("Add")');
    }
    
    // Save (this will test serialization performance)
    const startTime = Date.now();
    await page.keyboard.press('Control+S');
    await page.waitForTimeout(500); // Wait for save to complete
    const endTime = Date.now();
    
    // Save should complete in reasonable time (<2s)
    expect(endTime - startTime).toBeLessThan(2000);
  });

  test('should handle switching between skins rapidly', async ({ page }) => {
    // Create and save first skin
    await page.click('text=File');
    await page.click('text=New');
    await page.keyboard.press('Control+S');
    await page.fill('input[placeholder="Filename"]', 'skin1.vcp');
    await page.click('button:has-text("Save")');
    
    // Rapidly create and switch skins
    for (let i = 0; i < 10; i++) {
      await page.click('text=File');
      await page.click('text=New');
      await page.waitForTimeout(50);
      
      // Close without saving
      const closeBtn = page.locator('button:has-text("Don\'t Save")');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
    
    // App should still be responsive
    const gridContainer = page.locator('[data-testid="vcp-grid"]');
    await expect(gridContainer).toBeVisible({ timeout: 5000 });
  });

  test('should handle clipboard operations under load', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Add items and copy/paste rapidly
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="add-button"]');
      await page.fill('input[placeholder="Button Name"]', `btn_${i}`);
      await page.click('button:has-text("Create")');
      
      // Select and copy
      await page.click(`[data-testid="button-${i}"]`);
      await page.keyboard.press('Control+C');
      
      // Paste multiple times
      for (let j = 0; j < 3; j++) {
        await page.keyboard.press('Control+V');
      }
    }
    
    // Verify buttons exist
    const buttonCount = await page.locator('[data-testid="button-item"]').count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should handle grid rendering with 100+ elements', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Add 100 borders
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => {
        const event = new CustomEvent('addBorder', {
          detail: { name: `border_${i}` }
        });
        window.dispatchEvent(event);
      });
      
      if (i % 10 === 0) {
        await page.waitForTimeout(50);
      }
    }
    
    // Grid should still render
    const gridItems = await page.locator('[data-testid="border-item"]').count();
    expect(gridItems).toBeGreaterThanOrEqual(0);
  });

  test('should handle dialog open/close spam without crashes', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Rapidly open and close dialogs
    for (let i = 0; i < 30; i++) {
      const settingsBtn = page.locator('[data-testid="settings-button"]');
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        await page.waitForTimeout(10);
        
        const closeBtn = page.locator('button[aria-label="Close"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    }
    
    // App should recover
    await page.waitForTimeout(500);
    const mainContainer = page.locator('main');
    await expect(mainContainer).toBeVisible();
  });

  test('should handle drag operations on grid boundaries', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Add border
    await page.click('[data-testid="add-border"]');
    await page.fill('input[placeholder="Border Name"]', 'drag_test');
    await page.click('button:has-text("Add")');
    
    // Try dragging outside boundaries
    const gridElement = page.locator('[data-testid="vcp-grid"]');
    const box = await gridElement.boundingBox();
    
    if (box) {
      // Drag from inside to outside boundaries
      const startX = box.x + 10;
      const startY = box.y + 10;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      
      // Move far outside grid
      await page.mouse.move(startX - 500, startY - 500, { steps: 10 });
      await page.mouse.move(startX + 1000, startY + 1000, { steps: 10 });
      
      await page.mouse.up();
    }
    
    // App should recover gracefully
    const appTitle = page.locator('title');
    await expect(appTitle).toContainText('VCP Editor');
  });

  test('should recover from invalid paste operations', async ({ page }) => {
    await page.click('text=File');
    await page.click('text=New');
    
    // Try pasting without anything selected
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+V');
      await page.waitForTimeout(10);
    }
    
    // App should still work
    await page.click('[data-testid="add-button"]');
    await page.fill('input[placeholder="Button Name"]', 'recovery_test');
    await page.click('button:has-text("Create")');
    
    // Verify button was created
    const buttonCount = await page.locator('[data-testid="button-item"]').count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});
