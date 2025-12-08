# VCP Editor - Theory of Operation

## Overview

VCP Editor is a desktop application built with Tauri (Rust backend) and React + TypeScript (frontend) that enables visual editing of Virtual Control Panel (VCP) configuration files for Centroid CNC controllers. The application provides a WYSIWYG grid-based editor where users can place, resize, and configure buttons, images, and borders on a customizable grid.

## Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript with Vite build system
- **Backend**: Tauri 2.9.4 (Rust) for native OS integration
- **State Management**: React hooks and local component state
- **Persistence**: Tauri Store plugin for settings and window state
- **File I/O**: Tauri filesystem APIs for VCP file operations

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  (Main orchestrator - state, settings, menu handlers)        │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴───────┬──────────────┬──────────────┐
        │               │              │              │
   ┌────▼────┐   ┌─────▼──────┐  ┌───▼──────┐  ┌────▼─────┐
   │ Toolbar │   │  VcpGrid   │  │Inspector │  │ Dialogs  │
   └─────────┘   └────────────┘  └──────────┘  └──────────┘
                      │
              ┌───────┴───────┐
              │               │
         ┌────▼────┐    ┌────▼─────┐
         │ Buttons │    │  Images  │
         │ Borders │    │ Grid     │
         └─────────┘    └──────────┘
```

## Data Flow

### 1. File Loading

```
User Action (Open File)
    ↓
App.tsx handleOpen()
    ↓
Tauri open() dialog
    ↓
Tauri readTextFile()
    ↓
Rust parser.rs parseVCP()
    ↓
VcpDocument JSON
    ↓
App.tsx setDocument()
    ↓
VcpGrid renders elements
```

### 2. Element Editing

```
User clicks element in VcpGrid
    ↓
VcpGrid handleMouseDown()
    ↓
App.tsx setSelection()
    ↓
Inspector displays properties
    ↓
User modifies property
    ↓
Inspector onChange handler
    ↓
App.tsx handleUpdateButton/Image/Border()
    ↓
UndoRedoManager.execute()
    ↓
Document state updated
    ↓
VcpGrid re-renders with new values
```

### 3. File Saving

```
User Action (Save/Save As)
    ↓
App.tsx handleSave()
    ↓
Rust parser.rs generateVCP()
    ↓
XML string generated
    ↓
Tauri writeTextFile()
    ↓
File written to disk
    ↓
App.tsx setHasUnsavedChanges(false)
```

## Key Subsystems

### Grid System

The grid is the core visual representation of the VCP layout:

- **Coordinate System**: 1-based indexing (column 1 = first column) matching VCP XML format
- **Cell Size**: Base 120px × 120px, scaled by zoom (50-200%)
- **Spacing**: 2px between cells
- **Position Calculation**: `getCellPosition(row, col)` converts grid coordinates to pixel positions
- **Rendering**: SVG for grid lines, absolute-positioned divs for elements

### Element Positioning

Elements use a span-based layout system:

**Buttons**:
- Position: `column`, `row` (1-based)
- Size: `column_span`, `row_span` (defaults to 1)
- Visual: Fills cell span minus 10px margin on all sides

**Images**:
- Position: `column_start`, `row_start` (1-based)
- Size: `column_span`, `row_span`
- Visual: Fills cell span minus 10px margin on all sides

**Borders**:
- Position: `column_start`, `row_start` (1-based)
- Size: `column_span`, `row_span`
- Visual: Outline rendered at exact cell boundaries
- Thickness: 1-4px constrained

### Interaction Model

#### Selection
- Single-click selects an element
- Selected element shows in Inspector
- Visual feedback: selection outline

#### Dragging
- Click and drag to move elements
- Visual feedback: element opacity 0.6, ghost position shown
- Grid snapping: elements snap to cell boundaries
- Drop validation: prevents placing out of grid bounds

#### Resizing
- Selected element shows 8 resize handles (N, NE, E, SE, S, SW, W, NW)
- Drag handle to resize element span
- Minimum size: 1×1 cell
- Validation: prevents resizing beyond grid or into invalid positions

#### Multi-Element Management
- Grid validation prevents orphaning elements when removing rows/columns
- Checks all buttons, images, borders before allowing grid size changes

### Undo/Redo System

The `UndoRedoManager` provides command pattern-based history:

```typescript
interface Command {
  execute(doc: VcpDocument): VcpDocument;
  undo(doc: VcpDocument): VcpDocument;
  description: string;
}
```

**Features**:
- Configurable history depth (5-50 operations)
- Automatic state snapshots
- Selection clearing on undo/redo to prevent dangling references
- Operations: Add/Update/Delete Button/Image/Border, Grid changes

**Lifecycle**:
1. User action triggers command creation
2. Command executed, new state returned
3. Command pushed to history stack
4. Redo stack cleared
5. If history exceeds max size, oldest command removed

### Settings System

Persistent application configuration stored via Tauri Store plugin:

**Structure**:
```typescript
interface AppSettings {
  grid: GridSettings;      // Line style, color, thickness, zoom, visibility
  display: DisplaySettings; // Labels, theme
  editor: EditorSettings;   // Undo depth, autosave, confirmations
  files: FileSettings;      // Auto-open last, default location
}
```

**Persistence Flow**:
```
Settings Dialog Change
    ↓
App.tsx handleSettingsSave()
    ↓
Store.set('settings', newSettings)
    ↓
Store.save()
    ↓
Settings written to disk
    ↓
Components receive updated settings via props
```

**Initialization**:
- On app start, load from store or use defaults
- Apply settings to grid rendering, undo manager, etc.

### Dialog System

Three specialized dialog types:

**ThreeButtonDialog**:
- Generic 3-button pattern
- Platform-aware button ordering (macOS: left/center/right, others: right/center/left)
- Used for: unsaved changes, confirmations

**UnsavedChangesDialog**:
- Specialized wrapper for save/don't save/cancel scenarios
- Integrated with file operations

**SettingsDialog**:
- Tabbed interface (Grid, Display, Editor, Files)
- Live preview of some changes (grid appearance)
- Validation (undo depth 5-50, zoom 50-200%)

### Window Management

**Close Handling**:
```
User closes window
    ↓
Tauri onCloseRequested event
    ↓
App.tsx checks hasUnsavedChanges
    ↓
If unsaved: preventDefault(), show dialog
If saved: allow close
    ↓
Dialog result:
  - Save: save file, then close
  - Don't Save: close immediately
  - Cancel: stay open
```

**Quit Handling**:
- Custom menu item emits 'menu-quit' event
- Same unsaved changes flow as window close
- Uses Tauri destroy() API after confirmation

### Menu System

Tauri native menus with custom event handlers:

**Menu Items**:
- New (⌘N / Ctrl+N)
- Open (⌘O / Ctrl+O)
- Save (⌘S / Ctrl+S)
- Save As (⌘⇧S / Ctrl+Shift+S)
- Print (⌘P / Ctrl+P)
- Settings (⌘, / Ctrl+,)
- Quit (⌘Q / Ctrl+Q)

**Event Flow**:
```
User clicks menu item
    ↓
Tauri menu event with ID
    ↓
Rust lib.rs menu_handler()
    ↓
window.emit('menu-<action>')
    ↓
React App.tsx listen() handler
    ↓
Appropriate action handler called
```

### Parser (Rust Backend)

The Rust parser handles VCP XML serialization/deserialization:

**Key Functions**:

`parse_vcp(xml: String) -> VcpDocument`:
- Parses XML using quick-xml crate
- Extracts buttons, images, borders, grid dimensions
- Converts to JSON-serializable structure
- Error handling with detailed messages

`generate_vcp(doc: VcpDocument) -> String`:
- Converts document back to VCP XML format
- Maintains proper XML structure and attributes
- Handles optional attributes (spans default to 1)
- Preserves color formatting, file paths

**Data Models** (models.rs):
```rust
struct VcpDocument {
    buttons: Vec<Button>,
    images: Vec<Image>,
    borders: Vec<Border>,
    num_rows: u32,
    num_columns: u32,
}
```

### Print Functionality

Tauri window.print() integration:

```
User selects Print
    ↓
App.tsx handlePrint()
    ↓
Rust print_window command
    ↓
window.print() via Tauri API
    ↓
Browser print dialog
    ↓
Grid rendered for print
```

### Dark Mode

CSS-based automatic theme switching:

```css
@media (prefers-color-scheme: dark) {
  /* Dark theme styles */
}
```

- Follows system preference automatically
- No manual toggle (honors OS setting)
- All components support dark mode
- Consistent color palette across UI

## State Management

### Document State
- Centralized in `App.tsx`
- Immutable updates via spread operators
- Passed down to components as props
- Modified only through undo/redo commands

### Selection State
- Tracks currently selected element: `{type: 'button'|'image'|'border', index: number}`
- Cleared on undo/redo, file operations
- Single selection only (no multi-select)

### UI State
- Modal dialogs (Settings, Unsaved Changes, Confirmations)
- Drag/resize interaction state in VcpGrid
- Toolbar button states based on selection

### Persistent State
- Settings (Tauri Store)
- Last opened file path (Tauri Store)
- Window position/size (Tauri window state)

## Error Handling

### File Operations
- Tauri dialog cancellation (null return)
- File read/write errors (try/catch)
- Parser errors (Rust Result type)
- User-friendly error messages via dialogs

### Validation
- Grid size changes check for element conflicts
- Resize operations validate against grid bounds
- Property inputs constrain values (thickness 1-4, zoom 50-200%)
- Prevents invalid element placements

### Defensive Programming
- Null checks on selection before access
- Array bounds checking
- Optional chaining for nested properties
- Default values for missing attributes

## Performance Considerations

### Rendering Optimization
- React key props for list items
- Minimal re-renders (proper dependency arrays)
- Absolute positioning for elements (no layout thrashing)
- SVG for efficient grid line rendering

### State Updates
- Immutable patterns prevent unexpected mutations
- Batch updates where possible
- Debouncing not currently needed (small documents)

### File I/O
- Async Tauri commands don't block UI
- Parser runs in Rust (fast)
- No incremental saving (files are small, <100KB typical)

## Extension Points

The architecture supports future enhancements:

1. **Additional Element Types**: Add new element renderers in VcpGrid
2. **Advanced Selection**: Multi-select, group operations
3. **Themes**: Expand beyond dark/light modes
4. **Templates**: Pre-configured VCP layouts
5. **Validation Rules**: More complex element placement constraints
6. **Export Formats**: PDF, PNG screenshots
7. **Keyboard Shortcuts**: Arrow keys for element movement
8. **Alignment Tools**: Snap to grid, distribute evenly
9. **Copy/Paste**: Duplicate elements
10. **Layers**: Z-ordering for overlapping elements

## Security Considerations

- Tauri capability system restricts API access
- File system operations limited to user-selected paths
- No network access required
- Store plugin writes to app-specific directory
- XML parsing uses safe Rust libraries (no arbitrary code execution)

## Communication Patterns

### Component Communication

The application uses **React's unidirectional data flow** with callback props rather than an event emitter pattern:

**Parent → Child (Data Down)**:
```typescript
// App.tsx passes data to VcpGrid
<VcpGrid 
  document={document}           // Data flows down
  selection={selection}
  gridSettings={settings.grid}
/>
```

**Child → Parent (Callbacks Up)**:
```typescript
// VcpGrid calls parent callbacks
<VcpGrid
  onSelectionChange={setSelection}      // Callbacks flow up
  onElementUpdate={handleUpdateButton}
  onElementDrag={handleDragElement}
/>
```

### No Event Bus

Unlike event-driven architectures, there is **no central event emitter** or message bus. Communication happens through:

1. **Props drilling**: Data and callbacks passed through component tree
2. **Direct function calls**: Child components call parent callbacks
3. **State updates**: Parent updates state, React re-renders children

**Example interaction flow**:
```
User clicks button in VcpGrid
    ↓
VcpGrid.handleMouseDown() directly calls
    ↓
props.onSelectionChange({type: 'button', index: 5})
    ↓
App.tsx setSelection() updates state
    ↓
React re-renders Inspector with new selection prop
```

### Tauri Event System

The **only event listeners** in the application are for Tauri system events:

**Menu Events**:
```typescript
// App.tsx listens to menu events from Rust
listen('menu-new', handleNew);
listen('menu-save', handleSave);
listen('menu-quit', handleQuit);
```

**Window Events**:
```typescript
// Window close/resize events
getCurrentWindow().onCloseRequested(async (event) => {
  // Handle unsaved changes
});
```

These are **external OS/native events**, not internal application events.

### Why No Internal Events?

The application is small enough that **direct callbacks are simpler and more maintainable**:

**Advantages of callback approach**:
- Type-safe: TypeScript checks callback signatures
- Traceable: Easy to follow data flow in IDE
- Testable: Mock functions straightforward
- Simple: No subscription/unsubscription lifecycle

**When events would be beneficial**:
- Cross-cutting concerns (logging, analytics)
- Multiple components need same data updates
- Decoupling distant components
- Plugin/extension architecture

For VCP Editor's size and complexity, the callback pattern is appropriate. If the app grows significantly (e.g., adding collaborative editing, real-time preview, plugin system), an event-driven architecture could be considered.

