
# VCP Editor – Cross-Platform Application Specification

## 1. Project Overview

**Title:** VCP Editor

**Purpose:** A Cross-Platform desktop application for visually designing *Virtual Control Panel* (VCP) layouts that are stored in an XML-like UTF-8 file format.

**Users:** CNC integrators, control panel designers, and advanced hobbyists.

**Document Format:** Custom XML-like structure called **VCP Skin File** (UTF-8).

The editor provides a grid-based WYSIWYG interface for arranging **borders**, **images**, and **buttons**, synchronizing the visual layout with the underlying XML data.

---

## 2. Platform & Technology

- **Platform:** Windows (Development on MacOS)
- **Language:** Tauri, Rust
- **UI Framework:** Tauri
- **Backend:** Rust
- **Document Architecture:** Supports multiple documents
- **Parsing:** `XMLParser` or custom lightweight parser
- **Rendering:** Grid layout
- **Storage:** File-based (XML-like custom format)

---

## 3. Core Functionality

### 3.1 Document Handling

- Open, edit, and save `.vcp` VCP Skin files.
- Multiple documents open at once (Cross-Platform native tabbed-window).
- Unsaved document title: **“Untitled”**
- Edited state: `<filename> - *`

### 3.2 VCP Grid Renderer

- Window is resizeable
- Displays a **table grid**.
- Grid is centered; has a 20px margin
- Cells are 120px square, a 4px margin, no zoom, no scaling
- Borders are rendered in the margin between cells

- The table grid may contain:
  - Border element (spanning multiple cells)
  - column_count, row_count elements
  - A background element
  - On_Hover element
  - On_Click element

- Each cell may contain:
  - Image element (single cell unless row/column_span is present)
  - Button element (single cell unless row/column_span is present)
  - or empty

### 3.3 Selection Model

- Drag to select **multiple cells** (range selection).
  - Cells have a cell-spacing attribute of 4px
- Selecting:
  - **Border:** selection highlights its bounding rectangle.
  - **Image:** selection highlights exact image bounds.
  - **Button:** selection highlights the single cell.
  - **Empty:** selection highlights the cell background.

### 3.4 Editing via Inspector Pane

The Inspector is a persistent panel integrated into the document window (right side).

#### For Borders (multi-cell selection)

- Multi-cell selection is used to define Border column_start, row_start & column_span, row_span
- Shift-Select or Drag a dotted box with 8 drag handles to create a multi-cell selection.

Editable fields:
- `outline_color` (hex or “Transparent”)
- `outline_thickness` (integer pixels, constrain from 1px to 4px)
- `fill` (hex color or “Transparent”)

Inspector also displays the border’s:
- `row_start`, `column_start`
- `row_span`, `column_span`

#### For Images

Editable fields:
- `path` (text field for SVG path)

(Internally stored as `image` element.)

#### For Buttons

Editable fields:
- Button image name = text content of `<button>` element

### 3.5 Interaction

- Clicking a occupied cell selects the button/image occupying it, enables editing. 
- Inspector Pane is tabbed for Background, Border, Button, & Image
  - User selects a cell, or a range of cells; user activates desired tab to edit the element.
- Button can be replaced with an Image and vice-xersa.
- Contents of Cells can Drag-n-Drop to empty Cells, but not onto occupied cells.

### 3.6 Constraints

- Borders may overlap.
- Buttons default to single-cell, unless XML contains span attributes.
- Images may span multiple cells.
- Dragging is constrained to grid
---

## 4. User Interface Specification

### 4.1 Menu Bar

- File
  - New, Open..., Open Recent -, Close, -, Save, SaveAs...

- Edit
  - Undo, Redo, -, Cut, Copy, Paste, Delete
   - 5 levels of Undo, Redo: for Drag-n-Drops, edits in textboxes.

-Tools
  - Normal Selection, Rectangular Selection, -, Border, Button, Image, Background, On_Hover, On_Click -, Move Up, Move Down, Move Left, Move Right

- Window
  - (window stuff)


### 4.2 Main Window Layout

```
+----------------------------------------------------------------------------------+
| Toolbar: New • Open • Save • [space] • Undo • Redo • Cut • Copy • Paste • Delete |
+----------------------------------------------------------------------------------+
| VCP Grid Canvas (fill, 20px margin) | Inspector Pane (right side, fixed width)   |
+ ---------------------------------------------------------------------------------+
```

### 4.3 Inspector Pane

Sections appear contextually:

#### A. Outside of Grid Boundaries (Nothing Selected)

- Edit Grid properties:
  - Column Count and Row Count (constrain to column minimum 6; row minimum 14)
  - Background color (OS native colorpicker), or filepath to jpeg image (OS native Open 'image_file.jpg' picker)

#### B. Border Selected

**Border Properties**

- Fill Color (color well + hex field + Transparent option)
- Outline Color (same control)
- Outline Thickness (Stepper/TextField)

- Placement
  - Dotted-line selection box with drag handles places and resizes the border
  - **(read-write)**
    - row_start / row_span
    - column_start / column_span

#### C. Image Selected

**Image Properties**

- File path (text field)
- Browse button

#### D. Button Selected

**Button Properties**

- Button foldername (text)
- Browse button (browse for and return containing folder name)

---

## 5. Data Model

### 5.1 Entities and Fields

#### Border

- `row_start: Int`
- `column_start: Int`
- `row_span: Int`
- `column_span: Int`
- `fill: String`  // color hex or "Transparent"
- `outline_color: String`
- `outline_thickness: Int`

#### Image

- Attributes same as borders, plus:
  - `path: String`

#### Button

Stored as:

Note: button_name is svg image filename minus the extension.

```
<button row="x" column="y" [row_span=""] [column_span=""]>button_name</button>
```

### 5.2 Document Root

`<vcp_skin>` containing in Element order:
- Global `<column_count>` and `<row_count>` settings
- Global `<background>` setting
- Global `<on_click>` and `<on_hover>` settings
- 0+ borders
- 0+ images
- 0+ buttons


### 5.3 Persistence

- Load XML → Map to structs → Render grid
- Save: generate XML in canonical order (same as input if possible)
- Paths are relative to "C:\cncm\Resources\vcp (MacOS paths are relative to ```"<Project Root>:Resources" folder```)

---

## 6. System Integrations

- Cross-Platform document architecture (Rust)
- Color picker UI (OS Native ColorPicker)
- Native open/save/folder-pick dialogs
- Drag-and-drop external SVG into buttons

---

## 7. Performance Requirements

- Typical grid: 6×14
- Borders: ≤50
- Buttons: ≤100
- Images: ≤20

The app must remain fully responsive when moving or editing elements.

---

## 8. Security / Sandbox

- App runs sandboxed unless user opts out.
- User-selectable file access for reading/writing SVGs.

---

## 9. Error Handling

- Invalid XML → present alert “Malformed VCP file.”
- Missing SVG path → warning badge in inspector.
- Unsupported element → ignore silently but preserve on save if possible.
- Unsupported attribute → ignore silently but preserve on save if possible.

---

## 10. Testing Requirements

- Load/save symmetry tests (input → parse → save → load must match).
- UI tests for selection, editing, and inspector sync.
- Stress tests with large grids.

---

## 11. Application Support
- Application settings stored in native OS application support folder

---

## 12. Roadmap (Post 1.0)

- VCP_BUTTON Editor Inspector sub-pane
- Visual PLC word overlay editing
- SVG preview panel
- Theme templates
- Undo/Redo visualization

---

*Generated on December 2, 2025.*
*Modified 0n December 5, 2025.*