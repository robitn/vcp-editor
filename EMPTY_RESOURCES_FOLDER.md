# Using VCP Editor with Empty VCP Resources Folder

## Scenario: Shuffle-Only Mode

When the user only wants to shuffle buttons and images around in the grid (without importing new resources), they can leave **VCP resources folder** empty in Settings and work entirely within the **Work in Progress folder**.

## How It Works

### 1. Default File Locations

**Open File Dialog:**
1. First tries: `Work in Progress Folder/skins`
2. Falls back to: `VCP Resources Folder/skins` (if configured)
3. Falls back to: Current file directory
4. Final fallback: Home directory

**Save File Dialog:**
1. First tries: `Work in Progress Folder/skins`
2. Falls back to: Current file directory
3. Final fallback: `VCP Resources Folder/skins` (if configured)

### 2. Button Image Browsing

When creating/editing buttons:
1. **Browse button location:** `Work in Progress Folder/Buttons` (preferred) → `VCP Resources Folder/Buttons` (fallback)
2. **Copy destination:** Always `Work in Progress Folder/Buttons`
3. **Preview source:** Works in Progress Folder (where button XML exists)

### 3. General Image Handling

When adding images to the skin:
1. **Browse location:** `Work in Progress Folder/images` (preferred) → `VCP Resources Folder/images` (fallback)
2. **Copy destination:** Always `Work in Progress Folder/images`
3. **Display source:** Works in Progress Folder

### 4. File Copy-on-Open

- **Only triggers if:** Both folders are configured AND file is from VCP Resources Folder
- **Result:** File is copied from Resources to Work in Progress
- **If Resources folder is empty:** No copy occurs; file is opened in place

## Workflow Example: Shuffle-Only

1. **Settings:**
   - Work in Progress Folder: `C:\Users\YourName\Documents\VCP`
   - VCP Resources Folder: *(left empty)*
   - CNC Base Path: (set as needed)

2. **Open existing skin:**
   ```
   Open dialog defaults to: C:\Users\YourName\Documents\VCP\skins
   Select: your-existing-skin.vcp
   ```

3. **Shuffle buttons:**
   - Drag buttons around in the grid
   - Edit button properties
   - Changes saved to: `C:\Users\YourName\Documents\VCP/skins/your-existing-skin.vcp`

4. **Add/modify images (optional):**
   - Images browsed from: `C:\Users\YourName\Documents\VCP/images`
   - Images copied to: Same location
   - Changes reflected in grid

## Folder Structure (Shuffle-Only)

```
C:\Users\YourName\Documents\VCP/
├── skins/
│   ├── skin1.vcp
│   ├── skin2.vcp
│   └── ...
├── images/
│   ├── image1.svg
│   ├── image2.svg
│   └── ...
└── Buttons/
    ├── button1/
    │   ├── button1.xml
    │   └── button1.svg
    ├── button2/
    │   ├── button2.xml
    │   └── button2.svg
    └── ...
```

## Key Behaviors

✅ **Works without VCP Resources Folder:**
- Opening existing VCP files
- Shuffling buttons and images in the grid
- Editing element properties
- Saving changes to WIP folder
- Undo/redo all operations

✅ **File operations with empty Resources Folder:**
- Open: Defaults to WIP/skins
- Save: Writes to WIP/skins
- SaveAs: Prompts with WIP/skins as default
- New: Creates in WIP folder structure

✅ **Button/Image handling:**
- Browse: Looks in WIP folders first
- Copy: Copies to WIP folders
- Preview: Loads from WIP folders
- No cross-folder references needed

❌ **Cannot do without VCP Resources Folder (yet):**
- Export to CNC (requires resources folder configured)
- Import new buttons/images from external sources

## Settings Dialog Help Text

- **Work in Progress Folder** (required): "You will edit the files in this folder"
- **VCP Resources Folder** (optional): "Optional: Source folder for importing buttons/images. Leave blank if only shuffling existing elements"

## Technical Details

### Fallback Chain

All folder lookups follow this pattern:
```typescript
// For source/browse locations
const folderToUse = 
  (preferedWIPFolder && preferedWIPFolder.trim() !== '') 
    ? preferedWIPFolder 
    : resourcesFolder;

// For copy destinations
const destinationFolder = 
  (wipFolder && wipFolder.trim() !== '') 
    ? wipFolder 
    : resourcesFolder;
```

### File Operations

1. **Open**: Checks if file is from Resources folder
   - If both folders configured + file from Resources → Copy to WIP
   - Otherwise → Open file in place

2. **Save/SaveAs**: Always writes to WIP folder (if configured)

3. **File Browse**: Defaults to WIP, falls back to Resources

## Benefits

- ✅ Users don't need to configure Resources folder if not importing
- ✅ Simpler setup for shuffle-only workflows
- ✅ All edits stay in one controlled folder (WIP)
- ✅ No accidental modifications to source materials
- ✅ Works standalone for basic VCP editing

## Related Files

- `src/App.tsx` - Open/Save dialog logic with fallbacks
- `src/components/ButtonEditorModal.tsx` - Button image browsing
- `src/components/Inspector.tsx` - General image handling
- `src/components/VcpGrid.tsx` - Image URL generation
- `src/components/SettingsDialog.tsx` - UI help text
