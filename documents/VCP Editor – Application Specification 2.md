
# VCP Editor – Cross-Platform Application Specification (Revised)

## 1. Project Overview

**Title:** VCP Editor

**Purpose:** A Windows desktop application (developed on macOS) for visually designing *Virtual Control Panel* (VCP) layouts stored in a custom XML-like UTF-8 file format.

**Users:** CNC integrators, control-panel designers, and advanced hobbyists.

**Document Format:** Custom XML-like structure called a **VCP Skin File**.

The editor provides a grid-based WYSIWYG interface for arranging **borders**, **images**, and **buttons**, keeping the visual layout synchronized with the underlying XML.

---

## 2. Platform & Technology

* **Platform:** Windows (primary target; development on macOS)
* **Framework:** Tauri
* **Languages:** Rust (backend) + HTML/CSS/JS (Tauri frontend)
* **Document Architecture:** Multiple documents (tabbed windows)
* **Parsing:** `XMLParser` or a minimal custom parser
* **Rendering:** Grid-based canvas (HTML/CSS + Rust commands)
* **Storage:** File-based XML-like custom format

---

## 3. Core Functionality

### 3.1 Document Handling

* Open, edit, and save `.vcp` files.
* Multiple documents may be open simultaneously.
* Unsaved document name: **“Untitled”**
* Dirty indicator: `<filename> - *`

### 3.2 VCP Grid Renderer

* Main window is resizable.
* Grid is horizontally centered with a **20px outer margin**.
* **Cell size:** 120×120 px
* **Cell spacing:** 4px
* No zooming or scaling.
* Borders render in the spacing area between cells.

**Grid may contain:**

* `border` elements (multi-cell)
* `column_count`, `row_count`
* `background`
* `on_hover`, `on_click`

**Each cell may contain:**

* An **Image** (single or multi-cell)
* A **Button** (single or multi-cell)
* Or be empty

### 3.3 Selection Model

* Drag-selection defines a **multi-cell range**.
* 4px spacing improves hit detection.

Selection results:

* **Border:** Highlights its full bounding rectangle.
* **Image:** Highlights its exact drawn bounds.
* **Button:** Highlights its occupying cell region.
* **Empty cell:** Cell highlight only.

### 3.4 Editing via Inspector Pane

Inspector pane is a persistent right-side panel with tabs for
**Background**, **Border**, **Button**, and **Image**.

#### Borders

* A multi-cell selection defines `row_start`, `column_start`, `row_span`, `column_span`.
* Borders can be created by dragging a dotted rectangle with 8 handles.

Editable:

* `fill` (color hex or Transparent)
* `outline_color`
* `outline_thickness` (1–4 px)

Editable placement fields:

* `row_start`, `column_start`
* `row_span`, `column_span`

#### Images

Editable:

* `path` to SVG file (text or file browser)

#### Buttons

Editable:

* **Button name** (text): filename of SVG without extension
* Browse button selects folder; editor inserts folder name as the button’s displayed value.

### 3.5 Interaction

* Clicking a filled cell selects its element.
* User chooses the appropriate inspector tab to edit the element.
* Buttons may be replaced with images and images with buttons.
* Drag-and-drop:

  * Element → empty cell: allowed
  * Element → occupied cell: not allowed

### 3.6 Constraints

* Borders **may overlap**.
* Buttons default to single cell unless spans exist in XML.
* Images may span multiple cells.
* Dragging is constrained to the grid.

---

## 4. User Interface Specification

### 4.1 Menu Bar

**File**

* New, Open…, Open Recent →, Close, —, Save, Save As...

**Edit**

* Undo, Redo, —, Cut, Copy, Paste, Delete
* *Undo/Redo:* 5 levels (drag-n-drop, text edits)

**Tools**

* Normal Selection
* Rectangular Selection
* —
* Border
* Button
* Image
* Background
* On_Hover
* On_Click
* —
* Move Up / Down / Left / Right (nudging operations)

**Window**

* OS-standard window commands

### 4.2 Main Window Layout

```
+----------------------------------------------------------------------------------+
| Toolbar: New • Open • Save • [space] • Undo • Redo • Cut • Copy • Paste • Delete |
+----------------------------------------------------------------------------------+
| VCP Grid Canvas (centered, 20px margin) | Inspector Pane (fixed width, right)    |
+----------------------------------------------------------------------------------+
```

### 4.3 Inspector Pane

#### A. No Selection (Background / Grid Editing)

* Set `column_count` and `row_count`

  * Minimum column = 6
  * Minimum row = 14
* Background:

  * Color picker (native OS)
  * Or image path (JPEG)

#### B. Border

* Fill color / Transparent
* Outline color
* Outline thickness
* Placement: drag handles or numeric input

  * `row_start`, `row_span`
  * `column_start`, `column_span`

#### C. Image

* File path (text)
* Browse button

#### D. Button

* Button folder name (text)
* Browse: returns selected folder name

---

## 5. Data Model

### 5.1 Entities

#### Border

```
row_start: Int
column_start: Int
row_span: Int
column_span: Int
fill: String           // hex or "Transparent"
outline_color: String
outline_thickness: Int
```

#### Image

Inherits border geometry fields, plus:

```
path: String           // relative or absolute
```

#### Button

Stored as:

```
<button row="x" column="y" [row_span=""] [column_span=""]>button_name</button>
```

Where **button_name** is the SVG filename without extension.

### 5.2 Document Root

Element order:

1. `<column_count>`
2. `<row_count>`
3. `<background>`
4. `<on_click>`
5. `<on_hover>`
6. `<border>` elements
7. `<image>` elements
8. `<button>` elements

### 5.3 Persistence

* Load: XML → structs → grid
* Save: XML in canonical order (preserve input ordering when possible)
* Paths:

  * Windows: relative to `C:\cncm\Resources\vcp`
  * macOS: relative to `"<Project Root>/Resources"`

---

## 6. System Integrations

* Rust multi-document management
* Native color picker
* Native file/folder dialogs
* Drag-and-drop SVG to create/replace button images

---

## 7. Performance Requirements

* Grid: ~6×14
* ≤50 borders
* ≤100 buttons
* ≤20 images

App must remain responsive during drag, movement, resizing, or editing.

---

## 8. Security / Sandbox

* App runs sandboxed unless user opts out
* User chooses what file paths to expose (SVGs, backgrounds)

---

## 9. Error Handling

* Malformed XML → alert
* Missing SVG path → warning badge
* Unsupported elements/attributes → preserved but ignored in editor

---

## 10. Testing Requirements

* Load/save symmetry
* Inspector–selection consistency
* Stress tests with large grid counts

---

## 11. Application Support

* Store app settings (window size, last paths, etc.) in OS-native support directory

---

## 12. Roadmap (Post 1.0)

* Advanced Button Inspector panel
* Visual PLC-word overlay tools
* SVG preview viewer
* Theme templates
* Undo/Redo timeline visualization

---

*Generated December 2, 2025*
*Revised December 5, 2025*

## Sample VCP File: ##

<vcp_skin>
    <background>#E9E0B7</background>
    <column_count>6</column_count>
    <row_count>14</row_count>
    <border>
        <column_span>2</column_span>
        <column_start>1</column_start>
        <fill>#00007F</fill>
        <row_span>4</row_span>
        <row_start>1</row_start>
        <outline_color>#000000</outline_color>
        <outline_thickness>4</outline_thickness>
    </border>
    <border>
        <column_span>5</column_span>
        <column_start>1</column_start>
        <fill>Transparent</fill>
        <row_span>1</row_span>
        <row_start>5</row_start>
        <outline_color>#000000</outline_color>
        <outline_thickness>2</outline_thickness>
    </border>
    <border>
        <column_span>3</column_span>
        <column_start>4</column_start>
        <fill>Transparent</fill>
        <row_span>3</row_span>
        <row_start>11</row_start>
        <outline_color>#000000</outline_color>
        <outline_thickness>1</outline_thickness>
    </border>
    <border>
        <column_span>3</column_span>
        <column_start>4</column_start>
        <fill>Transparent</fill>
        <row_span>1</row_span>
        <row_start>11</row_start>
        <outline_color>Transparent</outline_color>
        <outline_thickness>1</outline_thickness>
        <plc_word>
            <number>31</number>
            <color>#000000</color>
            <fontsize>22</fontsize>
            <font>Sergio UI</font>
            <fontstyle>bold</fontstyle>
            <verticalalignment>bottom</verticalalignment>
            <horizontalalignment>center</horizontalalignment>
            <marginbottom>-5</marginbottom>
            <percentage>true</percentage>
        </plc_word>
    </border>
    <image>
        <column_span>1</column_span>
        <column_start>1</column_start>
        <row_span>1</row_span>
        <row_start>5</row_start>
        <path>C:\cncm\resources\vcp\images\coolant.svg</path>
    </image>
    <image>
        <column_span>3</column_span>
        <column_start>4</column_start>
        <row_span>1</row_span>
        <row_start>1</row_start>
        <path>C:\cncm\resources\vcp\images\acornlogo.svg</path>
    </image>
    <image>
        <column_span>3</column_span>
        <column_start>4</column_start>
        <row_span>1</row_span>
        <row_start>11</row_start>
        <path>C:\cncm\resources\vcp\images\feedrate_override.svg</path>
    </image>
    <on_click>
        <opacity>100</opacity>
        <outline_color>#000000</outline_color>
    </on_click>
    <on_hover>
        <opacity>100</opacity>
        <outline_color>#ffffff</outline_color>
    </on_hover>
    <button row="1" column="1">spindle_plus</button>
    <button row="1" column="2">spindle_auto_man</button>
    <button row="1" column="3">spin_high</button>
    <button row="2" column="1">spindle_100</button>
    <button row="2" column="2">spindle_cw</button>
    <button row="2" column="4">set_axis_0</button>
    <button row="2" column="5">set_all_0</button>
    <button row="2" column="6">park</button>
    <button row="3" column="1">spindle_minus</button>
    <button row="3" column="2">spindle_ccw</button>
    <button row="2" column="3">spin_low</button>
    <button row="3" column="4">m55</button>
    <button row="3" column="5">m56</button>
    <button row="3" column="6">limit_switch_defeat</button>
    <button row="4" column="1">spindle_cancel</button>
    <button row="4" column="2">spindle_start</button>
    <button row="4" column="4">m57</button>
    <button row="4" column="5">m58</button>
    <button row="4" column="6">reset_home</button>
    <button row="5" column="2">coolant_auto_man</button>
    <button row="5" column="3">flood_coolant</button>
    <button row="5" column="4">mist_coolant</button>
    <button row="5" column="5">mill_vac_on</button>
    <button row="5" column="6">chip_conveyor</button>
    <button row="6" column="1">rapid_over</button>
    <button row="6" column="2">incr_cont</button>
    <button row="6" column="3">x1</button>
    <button row="6" column="4">x10</button>
    <button row="6" column="5">x100</button>
    <button row="7" column="2">4th_positive</button>
    <button row="7" column="4">y_positive</button>
    <button row="7" column="6">z_positive</button>
    <button row="8" column="3">x_negative</button>
    <button row="8" column="4">tortoise_hare</button>
    <button row="8" column="5">x_positive</button>
    <button row="9" column="2">4th_negative</button>
    <button row="9" column="4">y_negative</button>
    <button row="9" column="6">z_negative</button>
    <button row="10" column="1">cycle_cancel</button>
    <button row="10" column="6">single_block</button>
    <button row="10" column="4">tool_check</button>
    <button row="10" column="5">feed_hold</button>
    <button row="10" column="2">cycle_start</button>
    <button row="12" column="4">feedrate_negative</button>
    <button row="12" column="5">feedrate_100</button>
    <button row="12" column="6">feedrate_positive</button>
    <button row="13" column="4">feedrate_25</button>
    <button row="13" column="5">feedrate_50</button>
    <button row="13" column="6">feedrate_75</button>
    <button row="14" column="4">utils</button>
    <button row="14" column="5">vcp_options</button>
    <button row="14" column="6">push_free</button>
</vcp_skin>
