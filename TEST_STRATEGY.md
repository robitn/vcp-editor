# VCP Editor Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the VCP Editor application, covering unit tests, integration tests, E2E tests, stress tests, and fool tests.

## Test Architecture

### 1. Unit Tests (Rust Backend)
Located: `src-tauri/src/lib_tests.rs` and `src-tauri/tests/`

**Purpose:** Validate individual functions and core logic in isolation

**Coverage:**
- Button folder creation (`create_button_folder`)
- Button XML loading/saving (`load_button_xml`, `save_button_xml`)
- File copying operations (`copy_file_to_button_folder`)
- Folder structure initialization (`ensure_vcp_folder_structure`)
- Edge cases (nonexistent files, special characters in names)

**Key Test Cases:**
```
✓ test_create_button_folder_creates_directory
✓ test_create_button_folder_with_existing_folder  
✓ test_copy_file_to_button_folder_success
✓ test_copy_file_nonexistent_source
✓ test_save_button_xml_creates_file
✓ test_load_button_xml_success
✓ test_load_button_xml_not_found
✓ test_ensure_vcp_folder_structure
✓ test_ensure_vcp_folder_structure_idempotent
✓ test_file_operations_with_special_characters
```

### 2. Integration Tests (Rust)
Located: `src-tauri/tests/file_operations.rs`

**Purpose:** Test complex workflows combining multiple operations

**Coverage:**
- Complete button creation workflow
- Image copying and management
- VCP file creation with associated buttons
- Large file handling
- Concurrent folder creation
- Folder structure integrity

**Key Test Cases:**
```
✓ test_vcp_folder_creation_workflow
✓ test_create_and_save_button_workflow
✓ test_image_copy_workflow
✓ test_multiple_buttons_in_folder
✓ test_vcp_file_creation_workflow
✓ test_button_with_images
✓ test_concurrent_folder_creation
✓ test_vcp_file_with_multiple_buttons
✓ test_large_image_handling
✓ test_folder_structure_integrity
```

### 3. E2E Tests (Playwright)
Located: `e2e/`

#### 3.1 Stress Tests (`undo-redo-stress.spec.ts`)
**Purpose:** Push the undo/redo system to its limits

**Test Scenarios:**
- **100 edits with undo**: Perform 100 sequential edits and undo back to start
- **50 undo/redo cycles**: Perform 50 complete undo/redo cycles
- **Maximum history limit**: Verify history doesn't exceed 5 items
- **Edit after undo**: Verify undoing and then editing clears redo stack
- **Continuous rapid edits**: Perform edits as fast as possible

**Key Metrics:**
- Memory usage (no leaks)
- Performance (responsiveness)
- State consistency (dirty flag accuracy)
- History integrity (proper stack management)

#### 3.2 Fool Tests (`fool-tests.spec.ts`)
**Purpose:** Test application stability against unexpected/invalid inputs

**Edge Cases:**
- Rapid save/close operations
- Dragging elements outside grid boundaries
- Empty paste operations
- 1000 random rapid clicks
- Hold modifier keys (Ctrl, Shift)
- Rapid tab switching
- Drag and drop edge cases
- Cancel operations mid-flight
- Open/close dialogs rapidly
- Invalid file imports
- Corrupted settings recovery

#### 3.3 File Operations Tests (`file-operations.spec.ts`)
**Purpose:** Validate file handling and persistence

**Test Scenarios:**
- Create, edit, and save workflow
- Unsaved changes warning dialog
- Undo returns to clean state
- Save location accuracy (WIP folder)

### 4. Test Utilities
Located: `src-tauri/tests/common.rs`

**Helper Functions:**
```rust
setup_test_vcp_folder()           // Creates test folder structure
create_mock_button()              // Creates test button with XML
create_mock_image()               // Creates test SVG image
create_mock_vcp_file()            // Creates test VCP skin file
assert_file_contains()            // Validates file content
assert_file_exists()              // Validates file presence
assert_dir_exists()               // Validates directory presence
```

## Running Tests

### TypeScript/JavaScript Tests (E2E)

```bash
# Install dependencies
npm install

# Run all E2E tests
npm test

# Run specific test suite
npm run test:stress    # Undo/redo stress tests
npm run test:fool      # Edge case tests
npm run test:files     # File operation tests

# Interactive debugging
npm run test:ui        # UI mode with browser
npm run test:debug     # Debug mode with inspector

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Rust Tests (Unit & Integration)

```bash
# Run all tests
cargo test --release

# Run specific test
cargo test test_create_button_folder_creates_directory

# Run with output
cargo test -- --nocapture

# Run integration tests only
cargo test --test file_operations

# Run unit tests in lib
cargo test --lib
```

## Continuous Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)

**Runs on:**
- Push to main/develop branches
- Pull requests to main/develop

**Jobs:**
1. **Rust Tests** - Windows, macOS, Linux
   - Runs full cargo test suite
   - Caches dependencies for speed
   
2. **E2E Tests** - Ubuntu with Chromium, Firefox, WebKit
   - Builds frontend with Vite
   - Runs Playwright tests
   - Uploads HTML reports
   
3. **TypeScript Lint** - Ubuntu
   - Type checking with tsc
   - Catches type errors early
   
4. **Build Verification** - Windows, macOS, Linux
   - Verifies application builds successfully
   - Uploads build artifacts

## Test Execution Timeline

```
Commit → Push → GitHub Actions Workflow
           ↓
    ┌──────┴──────────┬─────────────┬───────────────┬──────────────┐
    ↓                 ↓             ↓               ↓              ↓
  Rust Tests      E2E Tests    TypeScript      Build         Build
  (all OS)        (chromium,    Lint         (Windows)      (macOS)
                  firefox,     (Ubuntu)      
                  webkit)                     Build
                               (Ubuntu)      (Linux)
    ↓                 ↓             ↓               ↓              ↓
  5-10 min        10-15 min      2-3 min        5-8 min       5-8 min
```

Total CI Time: ~15-20 minutes per push/PR

## Test Metrics & Targets

| Metric | Target | Current |
|--------|--------|---------|
| Unit Test Coverage (Backend) | >80% | TBD |
| E2E Test Coverage (Workflows) | Critical paths | ✓ |
| Stress Test Iterations | 50+ cycles | ✓ 50 |
| Fool Test Scenarios | 12+ edge cases | ✓ 12 |
| Build Success Rate | 100% | ✓ |
| CI Execution Time | <20 min | TBD |

## Debugging Test Failures

### Rust Test Failures

```bash
# See full error output
cargo test -- --nocapture

# Run single test with backtrace
RUST_BACKTRACE=1 cargo test test_name -- --nocapture

# Check temp directory for artifacts
ls -la /tmp/  # Linux/macOS
dir %TEMP%    # Windows
```

### E2E Test Failures

```bash
# View HTML report
npx playwright show-report

# Debug specific test
npx playwright test fool-tests.spec.ts --debug

# Trace failures
npx playwright test --trace on
```

## Best Practices

### Writing Tests

1. **Unit Tests**: Test one thing per test
   ```rust
   #[test]
   fn test_single_responsibility() {
       // Setup
       // Execute
       // Assert
   }
   ```

2. **Integration Tests**: Use helpers from `common.rs`
   ```rust
   let temp_dir = setup_test_vcp_folder();
   let button_dir = create_mock_button(temp_dir.path(), "test");
   ```

3. **E2E Tests**: Follow user workflows
   ```typescript
   // Navigate to app
   // Create skin
   // Add button
   // Save file
   // Verify save location
   ```

### Test Maintenance

- Update tests when requirements change
- Add tests for new bugs discovered
- Keep test data in reasonable size
- Use meaningful test names that describe what is being tested
- Document complex test scenarios with comments

## Known Limitations

1. **File System Mocking**: Rust tests use real temp directories (no mocking)
   - Trade-off: More realistic but slower
   - Benefit: Catches actual I/O issues

2. **UI Automation Limits**: Playwright can't test actual Tauri native dialogs
   - Work-around: Mock dialogs in tests
   - Future: Use Tauri testing utilities when available

3. **Cross-Platform Timing**: E2E tests on macOS/Linux may have timing variations
   - Solution: Generous wait times in tests
   - Monitoring: CI alerts on flaky tests

## Future Improvements

- [ ] Add visual regression testing for UI
- [ ] Property-based testing with `proptest` crate
- [ ] Performance benchmarking suite
- [ ] Coverage report generation (lcov)
- [ ] Mutation testing for test quality
- [ ] Load testing with concurrent users
- [ ] Accessibility (a11y) testing

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tauri Testing](https://tauri.app/develop/testing)
- [GitHub Actions](https://docs.github.com/en/actions)
