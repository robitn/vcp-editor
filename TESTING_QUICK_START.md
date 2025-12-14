# Testing Quick Start Guide

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@playwright/test` - E2E testing framework
- All existing project dependencies

### 2. Verify Installation

```bash
# Check Playwright is installed
npx playwright --version

# Verify Rust toolchain
rustc --version
cargo --version
```

## Running Tests

### Quick Start (Run All Tests)

```bash
npm test
```

### Run Specific Test Suites

```bash
# Undo/Redo stress tests (5 tests)
npm run test:stress

# Fool tests - edge cases (12 tests)
npm run test:fool

# File operations tests (4 tests)
npm run test:files

# Performance tests (10 tests)
npx playwright test performance

# All unit/integration tests
cd src-tauri
cargo test --release
cd ..
```

### Interactive Testing

```bash
# Playwright UI mode - visual test runner with browser
npm run test:ui

# Debug mode - step through tests with inspector
npm run test:debug

# Watch mode - re-run tests on file changes
npx playwright test --watch
```

## Expected Output

### E2E Tests
```
Running 31 tests (5 stress + 12 fool + 4 file-ops + 10 performance)

✓ undo-redo-stress.spec.ts (5 tests)
✓ fool-tests.spec.ts (12 tests)  
✓ file-operations.spec.ts (4 tests)
✓ performance.spec.ts (10 tests)

Total: 31 passed in 2m 30s
```

### Rust Tests
```
running 20 tests

test tests::test_create_button_folder_creates_directory ... ok
test tests::test_copy_file_to_button_folder_success ... ok
test tests::test_load_button_xml_not_found ... ok
test file_operations::test_vcp_folder_creation_workflow ... ok
test file_operations::test_concurrent_folder_creation ... ok
[... 15 more tests ...]

test result: ok. 20 passed in 12.34s
```

## Test Scenarios Overview

### Stress Tests (Undo/Redo)
- `100 edits + undo to start` - Tests history management
- `50 undo/redo cycles` - Tests stack manipulation
- `Maximum history limit` - Verifies 5-item cap
- `Edit after undo clears redo` - State correctness
- `Continuous rapid edits` - Performance under load

### Fool Tests (Edge Cases)
- Rapid save/close operations
- Drag operations outside grid
- Empty clipboard paste
- 1000 random rapid clicks
- Modifier key combinations
- Dialog open/close spam
- Invalid file imports
- Settings corruption recovery
- Tab switching during operations
- Concurrent file operations

### File Operations Tests
- Create/edit/save workflow
- Unsaved changes dialog
- Undo returns to clean state
- Correct save location (WIP folder)

### Performance Tests
- 200 sequential edits
- 100 undo/redo cycles
- Large state serialization
- Rapid skin switching
- Clipboard operations under load
- 100+ grid elements rendering
- Dialog spam resistance
- Boundary drag handling
- Invalid paste recovery

## CI/CD Testing

Tests run automatically on:
- **Push to main/develop**
- **Pull requests to main/develop**

GitHub Actions workflow (`.github/workflows/test.yml`):

```
┌─────────────────────────────────────────────────────┐
│           GitHub Actions Workflow                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Rust Tests   │  │ E2E Tests    │  │ Lint/Build │ │
│  │ (3 OS)       │  │ (Chromium,   │  │ (Ubuntu)   │ │
│  │ 5-10 min     │  │ Firefox,     │  │ 2-3 min    │ │
│  │              │  │ WebKit)      │  │            │ │
│  │              │  │ 10-15 min    │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│              Total: ~15-20 minutes                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Viewing Test Reports

### Playwright HTML Report
```bash
npm test
# View report:
npx playwright show-report
```

Opens interactive HTML dashboard with:
- Test results and timings
- Screenshots/video of failed tests
- Detailed error messages
- Test traces for debugging

### Rust Test Output
```bash
cd src-tauri
cargo test -- --nocapture
```

## Troubleshooting

### Tests Won't Start
```bash
# Ensure dev server is running (OR let Playwright start it)
npm run dev

# In another terminal
npm test
```

### Playwright Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npx playwright install
```

### Rust Build Errors
```bash
# Clean build
cd src-tauri
cargo clean
cargo test --release
```

### Tests Timing Out
Increase timeout in `playwright.config.ts`:
```typescript
use: {
  timeout: 30000, // 30 seconds per test
}
```

### Permission Denied (Rust Tests)
```bash
# On Windows PowerShell:
Remove-Item -Recurse -Force src-tauri/target/
cargo test --release
```

## Development Workflow

### Before Committing
```bash
# Run all tests locally
npm run test:stress
npm run test:fool
npm run test:files

cd src-tauri
cargo test --release
cd ..
```

### After Making Changes
```bash
# Run specific test suite for your changes
npm run test:fool    # If you changed UI
cargo test           # If you changed Rust code

# Run full suite before pushing
npm test
cd src-tauri && cargo test --release && cd ..
```

## Adding New Tests

### E2E Test Template
```typescript
// e2e/my-test.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should do something', async ({ page }) => {
    // Your test here
    expect(true).toBeTruthy();
  });
});
```

### Rust Test Template
```rust
#[test]
fn test_my_function() {
    // Setup
    let result = my_function();
    
    // Assert
    assert_eq!(result, expected);
}
```

## Performance Benchmarks

Current targets:
- **Undo/Redo**: 50 cycles in <2s
- **Save**: 50+ elements in <1s
- **Open**: <500ms for typical file
- **Render**: 100+ elements in <100ms

## Next Steps

1. ✅ Tests created and ready to run
2. ✅ CI/CD workflow configured
3. ✅ Test strategy documented
4. ⏳ **TODO**: Run tests locally to validate
5. ⏳ **TODO**: Fix any test failures
6. ⏳ **TODO**: Commit and push to GitHub

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Rust Testing](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tauri Testing Guide](https://tauri.app/develop/testing/)
