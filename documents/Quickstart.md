VCP Editor — Quickstart
=======================

Overview
--------
VCP Editor lets you design VCP layouts by placing borders, images, and buttons on a grid. This quickstart covers the main workflows: opening files, adding elements, editing, saving, and troubleshooting.

Open / Create
-------------
- Open an existing VCP folder: `File → Open` or `Cmd+O`. The app defaults to the last-used folder.
- To create a new layout, use `File → New` and choose a save location.

Add Elements
------------
- Use the toolbar buttons to add a **Border**, **Image**, or **Button**.
- Click a grid cell to place the selected element.

Select & Edit
-------------
- Single-click an element to select it. The Inspector shows editable properties.
- Hover to reveal resize handles; drag handles to resize.
- Borders have dedicated edge strips — click a border edge to select the border (this prevents selecting elements beneath it).
- Use the context menu (right-click) for quick actions: `Cut`, `Copy`, `Paste`, `Delete`, or `Add Border/Image/Button`.

Drag & Drop
----------
- Click and drag a selected element to reposition it. Press `Esc` to cancel a drag.

Save & Export
-------------
- Save: `Cmd+S` or `File → Save`.
- Export: `File → Export to CNC…` (packages the save folder and assets for use with CNC tools).

Undo / Redo / Clipboard
-----------------------
- Undo: `Cmd+Z` — Redo: `Cmd+Shift+Z`.
- Cut/Copy/Paste available via toolbar or context menu. Paste is disabled when target is occupied.

Toolbar & Shortcuts
------------------
- Common toolbar actions: `New`, `Open`, `Save`, `Undo`, `Redo`, `Cut`, `Copy`, `Paste`, `Delete`, `⟳ Images` (refresh assets).
- Keyboard shortcuts: `Cmd+S` (Save), `Cmd+O` (Open), `Cmd+Z` (Undo), `Cmd+Shift+Z` (Redo), `Delete` (Delete selection).

Images & Buttons
----------------
- Images and button icons are SVGs; theme-aware styling ensures they adapt to dark/light themes.
- If you replace image files on disk, click `⟳ Images` (Refresh Images) to reload assets.

Borders
-------
- Borders are created to fit within the grid bounds and can be resized via edge and corner handles.
- Borders render on top of images/buttons so clicking a border edge selects the border, not the underlying element.

Troubleshooting
---------------
- Replaced image not showing: click the toolbar `⟳ Images` button.
- Devtools visible in release: confirm `devtools` is disabled in `tauri.conf.json` and dev menu items were removed in the Rust menu code.
- Border selection blocked: hover handles are used so handles don’t block clicks; if selection seems wrong, click the border edge directly.

Developer Notes
---------------
- Version comes from `VITE_APP_VERSION` at build time.
- Attributions stored in settings and editable in the developer Settings screen.

Further help
------------
- Full manual and printable PDF available on request.

