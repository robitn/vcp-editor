import React, { useState } from 'react';
import { VcpDocument, Selection } from "../types";
import { GridSettings } from "../settingsTypes";
import { getImageUrl, getButtonAssetUrl } from "../utils/assetPaths";
import { useMenu, MenuItem } from "../utils/MenuService";
import "./VcpGrid.css";

interface VcpGridProps {
  document: VcpDocument;
  selection: Selection | null;
  onSelectionChange: (selection: Selection | null) => void;
  onDocumentChange: (document: VcpDocument) => void;
  gridSettings: GridSettings;
  vcpResourcesFolder: string;
  defaultSaveLocation?: string;
  imageCacheBuster: number;
  onAddBorder?: () => void;
  onAddImage?: () => void;
  onAddButton?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  canPaste?: boolean;
}

// const CELL_SIZE = 120; // Unused, kept for reference
const CELL_SPACING = 4;
const OUTER_MARGIN = 20;

const VcpGrid: React.FC<VcpGridProps> = ({
  document,
  selection,
  onSelectionChange,
  onDocumentChange,
  gridSettings,
  vcpResourcesFolder,
  defaultSaveLocation,
  imageCacheBuster,
  onAddBorder,
  onAddImage,
  onAddButton,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  canPaste = false,
}) => {
  // Calculate cell size based on zoom
  const CELL_SIZE = Math.round(120 * (gridSettings.cellZoom / 100));

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const [draggedElement, setDraggedElement] = useState<Selection | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ row: number; col: number; rowSpan: number; colSpan: number } | null>(null);

  const { showContextMenu } = useMenu();

  const gridWidth = document.column_count * (CELL_SIZE + CELL_SPACING) - CELL_SPACING;
  const gridHeight = document.row_count * (CELL_SIZE + CELL_SPACING) - CELL_SPACING;

  const getCellPosition = (row: number, col: number) => {
    return {
      x: (col - 1) * (CELL_SIZE + CELL_SPACING),
      y: (row - 1) * (CELL_SIZE + CELL_SPACING),
    };
  };

  const getCellFromPosition = (x: number, y: number): { row: number; col: number } => {
    const col = Math.floor(x / (CELL_SIZE + CELL_SPACING)) + 1;
    const row = Math.floor(y / (CELL_SIZE + CELL_SPACING)) + 1;
    return { row, col };
  };

  // Path utilities are now imported from utils/assetPaths.ts

  // Calculate luminance of a color and return contrasting highlight color
  const getContrastColor = (bgColor: string): string => {
    // Default to light blue if no background
    if (!bgColor) return '#007aff';

    // Parse hex color
    let hex = bgColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance (WCAG formula)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // If background is dark, use light highlight; if light, use dark highlight
    return luminance < 0.5 ? '#00bfff' : '#0066cc';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if clicking on a resize handle
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      e.stopPropagation();
      const handle = target.dataset.handle;
      if (selection && handle) {
        setIsResizing(true);
        setResizeHandle(handle);

        // Get current element spans
        let rowSpan = 1;
        let colSpan = 1;

        if (selection.type === 'border' && selection.index !== undefined) {
          const border = document.borders[selection.index];
          if (border) {
            rowSpan = border.row_span;
            colSpan = border.column_span;
          }
        } else if (selection.type === 'image' && selection.index !== undefined) {
          const image = document.images[selection.index];
          if (image) {
            rowSpan = image.row_span;
            colSpan = image.column_span;
          }
        } else if (selection.type === 'button' && selection.index !== undefined) {
          const button = document.buttons[selection.index];
          if (button) {
            rowSpan = button.row_span || 1;
            colSpan = button.column_span || 1;
          }
        }

        setResizeStart({
          row: selection.row || 1,
          col: selection.column || 1,
          rowSpan,
          colSpan,
        });
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - OUTER_MARGIN;
    const y = e.clientY - rect.top - OUTER_MARGIN;
    const cell = getCellFromPosition(x, y);
    if (cell.row >= 1 && cell.row <= document.row_count &&
      cell.col >= 1 && cell.col <= document.column_count) {
      // Check what element was actually clicked on (not just what's at the cell)
      // Find what element was actually clicked on
      let clickedElement: Selection | null = findElementAtCell(cell.row, cell.col);

      if (clickedElement) {
        // Start dragging the element
        setIsDragging(true);
        setDraggedElement(clickedElement);
        setDragStart(cell);
        setDragEnd(cell);
        // Calculate offset from element origin
        const elementRow = clickedElement.row || 1;
        const elementCol = clickedElement.column || 1;
        setDragOffset({
          x: cell.col - elementCol,
          y: cell.row - elementRow,
        });
        onSelectionChange(clickedElement);
      } else {
        // Just selecting an empty cell
        onSelectionChange({ type: 'empty', row: cell.row, column: cell.col });
      }
    } else {
      // Clicked outside grid bounds - deselect
      onSelectionChange(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - OUTER_MARGIN;
    const y = e.clientY - rect.top - OUTER_MARGIN;

    const cell = getCellFromPosition(x, y);

    if (isResizing && resizeStart && resizeHandle && selection) {
      // Handle resize
      if (cell.row >= 1 && cell.row <= document.row_count &&
        cell.col >= 1 && cell.col <= document.column_count) {
        setDragEnd(cell);
      }
    } else if (isDragging && dragStart && draggedElement && dragOffset) {
      // Handle drag
      if (cell.row >= 1 && cell.row <= document.row_count &&
        cell.col >= 1 && cell.col <= document.column_count) {
        setDragEnd(cell);
      }
    }
  };

  const handleMouseUp = () => {
    if (isResizing && resizeStart && dragEnd && resizeHandle && selection) {
      // Apply resize
      applyResize(selection, resizeStart, dragEnd, resizeHandle);
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
      setDragEnd(null);
    } else if (isDragging && dragStart && dragEnd && draggedElement && dragOffset) {
      // Calculate new position accounting for drag offset
      const newRow = Math.max(1, dragEnd.row - dragOffset.y);
      const newCol = Math.max(1, dragEnd.col - dragOffset.x);

      // Check if position changed
      if (newRow !== (draggedElement.row || 1) || newCol !== (draggedElement.column || 1)) {
        // Check if the target cell is occupied
        const targetOccupied = isPositionOccupied(newRow, newCol, draggedElement);

        if (!targetOccupied) {
          // Move the element
          moveElement(draggedElement, newRow, newCol);
        }
      }
    }

    setIsDragging(false);
    setDraggedElement(null);
    setDragOffset(null);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
    setDragEnd(null);
  };

  const isPositionOccupied = (row: number, col: number, excludeElement: Selection): boolean => {
    // Check if any other element occupies this position
    const elementAtPosition = findElementAtCell(row, col);

    if (!elementAtPosition) return false;

    // If it's the same element we're dragging, it's not occupied
    if (elementAtPosition.type === excludeElement.type &&
      elementAtPosition.index === excludeElement.index) {
      return false;
    }

    // Borders can overlap with anything, and things can be placed inside borders
    if (elementAtPosition.type === 'border' || excludeElement.type === 'border') {
      return false;
    }

    // Only prevent overlap between buttons/images and other buttons/images
    return true;
  };

  const moveElement = (element: Selection, newRow: number, newCol: number) => {
    const updatedDoc = { ...document };

    if (element.type === 'border' && element.index !== undefined) {
      const newBorders = [...updatedDoc.borders];
      newBorders[element.index] = {
        ...newBorders[element.index],
        row_start: newRow,
        column_start: newCol,
      };
      updatedDoc.borders = newBorders;
      onSelectionChange({ ...element, row: newRow, column: newCol });
    } else if (element.type === 'image' && element.index !== undefined) {
      const newImages = [...updatedDoc.images];
      newImages[element.index] = {
        ...newImages[element.index],
        row_start: newRow,
        column_start: newCol,
      };
      updatedDoc.images = newImages;
      onSelectionChange({ ...element, row: newRow, column: newCol });
    } else if (element.type === 'button' && element.index !== undefined) {
      const newButtons = [...updatedDoc.buttons];
      newButtons[element.index] = {
        ...newButtons[element.index],
        row: newRow,
        column: newCol,
      };
      updatedDoc.buttons = newButtons;
      onSelectionChange({ ...element, row: newRow, column: newCol });
    }

    onDocumentChange(updatedDoc);
  };

  const applyResize = (
    element: Selection,
    start: { row: number; col: number; rowSpan: number; colSpan: number },
    end: { row: number; col: number },
    handle: string
  ) => {
    let newRow = start.row;
    let newCol = start.col;
    let newRowSpan = start.rowSpan;
    let newColSpan = start.colSpan;

    // Calculate new dimensions based on handle
    switch (handle) {
      case 'se': // Southeast - resize both width and height
        newRowSpan = Math.max(1, end.row - start.row + 1);
        newColSpan = Math.max(1, end.col - start.col + 1);
        break;
      case 'e': // East - resize width only
        newColSpan = Math.max(1, end.col - start.col + 1);
        break;
      case 's': // South - resize height only
        newRowSpan = Math.max(1, end.row - start.row + 1);
        break;
      case 'sw': // Southwest - resize height and move/resize width
        newRowSpan = Math.max(1, end.row - start.row + 1);
        newColSpan = Math.max(1, start.col + start.colSpan - end.col);
        newCol = Math.min(end.col, start.col + start.colSpan - 1);
        break;
      case 'w': // West - move/resize width only
        newColSpan = Math.max(1, start.col + start.colSpan - end.col);
        newCol = Math.min(end.col, start.col + start.colSpan - 1);
        break;
      case 'nw': // Northwest - move/resize both
        newRowSpan = Math.max(1, start.row + start.rowSpan - end.row);
        newRow = Math.min(end.row, start.row + start.rowSpan - 1);
        newColSpan = Math.max(1, start.col + start.colSpan - end.col);
        newCol = Math.min(end.col, start.col + start.colSpan - 1);
        break;
      case 'n': // North - move/resize height only
        newRowSpan = Math.max(1, start.row + start.rowSpan - end.row);
        newRow = Math.min(end.row, start.row + start.rowSpan - 1);
        break;
      case 'ne': // Northeast - move/resize height, resize width
        newRowSpan = Math.max(1, start.row + start.rowSpan - end.row);
        newRow = Math.min(end.row, start.row + start.rowSpan - 1);
        newColSpan = Math.max(1, end.col - start.col + 1);
        break;
    }

    // Ensure stays within grid bounds
    if (newRow + newRowSpan - 1 > document.row_count) {
      newRowSpan = document.row_count - newRow + 1;
    }
    if (newCol + newColSpan - 1 > document.column_count) {
      newColSpan = document.column_count - newCol + 1;
    }

    const updatedDoc = { ...document };

    if (element.type === 'border' && element.index !== undefined) {
      const newBorders = [...updatedDoc.borders];
      newBorders[element.index] = {
        ...newBorders[element.index],
        row_start: newRow,
        column_start: newCol,
        row_span: newRowSpan,
        column_span: newColSpan,
      };
      updatedDoc.borders = newBorders;
      onSelectionChange({ ...element, row: newRow, column: newCol });
    } else if (element.type === 'image' && element.index !== undefined) {
      const newImages = [...updatedDoc.images];
      newImages[element.index] = {
        ...newImages[element.index],
        row_start: newRow,
        column_start: newCol,
        row_span: newRowSpan,
        column_span: newColSpan,
      };
      updatedDoc.images = newImages;
      onSelectionChange({ ...element, row: newRow, column: newCol });
    } else if (element.type === 'button' && element.index !== undefined) {
      const newButtons = [...updatedDoc.buttons];
      newButtons[element.index] = {
        ...newButtons[element.index],
        row: newRow,
        column: newCol,
        row_span: newRowSpan,
        column_span: newColSpan,
      };
      updatedDoc.buttons = newButtons;
      onSelectionChange({ ...element, row: newRow, column: newCol });
    }

    onDocumentChange(updatedDoc);
  };

  const findElementAtCell = (row: number, col: number): Selection | null => {
    // Check buttons
    for (let i = 0; i < document.buttons.length; i++) {
      const btn = document.buttons[i];
      const rowSpan = btn.row_span || 1;
      const colSpan = btn.column_span || 1;

      if (row >= btn.row && row < btn.row + rowSpan &&
        col >= btn.column && col < btn.column + colSpan) {
        return { type: 'button', index: i, row: btn.row, column: btn.column };
      }
    }

    // Check images
    for (let i = 0; i < document.images.length; i++) {
      const img = document.images[i];

      if (row >= img.row_start && row < img.row_start + img.row_span &&
        col >= img.column_start && col < img.column_start + img.column_span) {
        return { type: 'image', index: i, row: img.row_start, column: img.column_start };
      }
    }

    // NOTE: Borders are NOT checked here. Borders should only be selected by clicking their edge handlers.
    // This allows users to add buttons/images to empty cells inside border interiors.
    return null;
  };

  // const findButtonAtCell = (row: number, col: number): Selection | null => {
  //   for (let i = 0; i < document.buttons.length; i++) {
  //     const btn = document.buttons[i];
  //     const rowSpan = btn.row_span || 1;
  //     const colSpan = btn.column_span || 1;

  //     if (row >= btn.row && row < btn.row + rowSpan &&
  //       col >= btn.column && col < btn.column + colSpan) {
  //       return { type: 'button', index: i, row: btn.row, column: btn.column };
  //     }
  //   }
  //   return null;
  // };

  // const findImageAtCell = (row: number, col: number): Selection | null => {
  //   for (let i = 0; i < document.images.length; i++) {
  //     const img = document.images[i];

  //     if (row >= img.row_start && row < img.row_start + img.row_span &&
  //       col >= img.column_start && col < img.column_start + img.column_span) {
  //       return { type: 'image', index: i, row: img.row_start, column: img.column_start };
  //     }
  //   }
  //   return null;
  // };

  const renderGrid = () => {
    const cells = [];

    // Grid line styles from settings
    const gridLineStyle = gridSettings.showGridLines ? {
      borderWidth: `${gridSettings.gridLineThickness}px`,
      borderStyle: gridSettings.gridLineStyle,
      borderColor: gridSettings.gridLineColor,
    } : {
      borderWidth: '0px',
    };

    // Get contrasting color for selected cell highlight
    const highlightColor = getContrastColor(document.background);

    for (let row = 1; row <= document.row_count; row++) {
      for (let col = 1; col <= document.column_count; col++) {
        const pos = getCellPosition(row, col);
        const isSelected = selection?.row === row && selection?.column === col;
        cells.push(
          <div
            key={`cell-${row}-${col}`}
            className={`grid-cell ${isSelected ? 'selected' : ''}`}
            style={{
              left: pos.x,
              top: pos.y,
              width: CELL_SIZE,
              height: CELL_SIZE,
              ...gridLineStyle,
              ...(isSelected ? {
                boxShadow: `inset 0 0 0 2px ${highlightColor}`,
                backgroundColor: `${highlightColor}22` // 22 = ~13% opacity
              } : {}),
            }}
          />
        );
      }
    }

    return cells;
  };

  const renderBorders = () => {
    return document.borders.map((border, index) => {
      const isDraggingThis = isDragging && draggedElement?.type === 'border' && draggedElement?.index === index;

      let row = border.row_start;
      let col = border.column_start;

      // If dragging, show at new position
      if (isDraggingThis && dragEnd && dragOffset) {
        row = Math.max(1, dragEnd.row - dragOffset.y);
        col = Math.max(1, dragEnd.col - dragOffset.x);
      }

      const pos = getCellPosition(row, col);
      const width = border.column_span * CELL_SIZE + (border.column_span - 1) * CELL_SPACING;
      const height = border.row_span * CELL_SIZE + (border.row_span - 1) * CELL_SPACING;
      const isSelected = selection?.type === 'border' && selection?.index === index;

      // Create clickable edge strips around the border perimeter
      const edgeWidth = 12; // Width of the clickable edge area in pixels

      return (
        <React.Fragment key={`border-${index}`}>
          {/* Visual border - no pointer events */}
          <div
            className={`grid-border ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''}`}
            style={{
              left: pos.x,
              top: pos.y,
              width,
              height,
              backgroundColor: border.fill === 'Transparent' ? 'transparent' : border.fill,
              border: `${border.outline_thickness}px solid ${border.outline_color}`,
              opacity: isDraggingThis ? 0.6 : 1,
              pointerEvents: 'none',
            }}
          />
          {/* Clickable border edges - four separate strips */}
          {/* Top edge */}
          <div
            className={`grid-border-edge ${isDraggingThis ? 'dragging' : ''}`}
            data-border-index={index}
            onMouseEnter={() => setHoveredElement({ type: 'border', index })}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange({ type: 'border', index, row: border.row_start, column: border.column_start });
            }}
            style={{
              left: pos.x,
              top: pos.y - edgeWidth / 2,
              width: width,
              height: edgeWidth,
            }}
          />
          {/* Right edge */}
          <div
            className={`grid-border-edge ${isDraggingThis ? 'dragging' : ''}`}
            data-border-index={index}
            onMouseEnter={() => setHoveredElement({ type: 'border', index })}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange({ type: 'border', index, row: border.row_start, column: border.column_start });
            }}
            style={{
              left: pos.x + width - edgeWidth / 2,
              top: pos.y,
              width: edgeWidth,
              height: height,
            }}
          />
          {/* Bottom edge */}
          <div
            className={`grid-border-edge ${isDraggingThis ? 'dragging' : ''}`}
            data-border-index={index}
            onMouseEnter={() => setHoveredElement({ type: 'border', index })}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange({ type: 'border', index, row: border.row_start, column: border.column_start });
            }}
            style={{
              left: pos.x,
              top: pos.y + height - edgeWidth / 2,
              width: width,
              height: edgeWidth,
            }}
          />
          {/* Left edge */}
          <div
            className={`grid-border-edge ${isDraggingThis ? 'dragging' : ''}`}
            data-border-index={index}
            onMouseEnter={() => setHoveredElement({ type: 'border', index })}
            onMouseLeave={() => setHoveredElement(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange({ type: 'border', index, row: border.row_start, column: border.column_start });
            }}
            style={{
              left: pos.x - edgeWidth / 2,
              top: pos.y,
              width: edgeWidth,
              height: height,
            }}
          />
        </React.Fragment>
      );
    });
  };

  const renderImages = () => {
    return document.images.map((image, index) => {
      const isDraggingThis = isDragging && draggedElement?.type === 'image' && draggedElement?.index === index;

      let row = image.row_start;
      let col = image.column_start;

      // If dragging, show at new position
      if (isDraggingThis && dragEnd && dragOffset) {
        row = Math.max(1, dragEnd.row - dragOffset.y);
        col = Math.max(1, dragEnd.col - dragOffset.x);
      }

      const pos = getCellPosition(row, col);
      const containerWidth = image.column_span * CELL_SIZE + (image.column_span - 1) * CELL_SPACING;
      const containerHeight = image.row_span * CELL_SIZE + (image.row_span - 1) * CELL_SPACING;
      const isSelected = selection?.type === 'image' && selection?.index === index;

      // Fill cell span with 10px margin from edges
      const margin = 10;
      const imageWidth = containerWidth - (2 * margin);
      const imageHeight = containerHeight - (2 * margin);
      const imageLeft = pos.x + margin;
      const imageTop = pos.y + margin;

      // Extract image name from path (handle both absolute paths and relative paths)
      let imageName = image.path;
      // If it's an absolute path, extract just the filename
      if (image.path.includes('/') || image.path.includes('\\')) {
        imageName = image.path.split(/[/\\]/).pop() || '';
      }
      // Remove extension if present
      imageName = imageName.replace(/\.[^/.]+$/, '');
      
      // Use shared utility to get image URL from WIP folder, fall back to resources folder
      const imageFolder = defaultSaveLocation || vcpResourcesFolder;
      const imageSrc = getImageUrl(imageFolder, imageName);

      return (
        <div
          key={`image-${index}`}
          className={`grid-image ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''}`}
          onMouseEnter={() => setHoveredElement({ type: 'image', index })}
          onMouseLeave={() => setHoveredElement(null)}
          style={{
            left: imageLeft,
            top: imageTop,
            width: imageWidth,
            height: imageHeight,
            opacity: isDraggingThis ? 0.6 : 1,
          }}
        >
          {imageSrc ? (
            <img
              key={`img-${index}-${imageCacheBuster}`}
              src={imageSrc}
              alt={imageName}
              className="image-content"
              onLoad={() => { /* image loaded */ }}
              onError={async (e) => {
                const fullPath = `${vcpResourcesFolder}/images/${imageName}.svg`;
                console.error('Failed to load image:', imageName, 'origPath:', fullPath, 'assetSrc:', imageSrc);

                // Check file validity
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke<string>('check_svg_file', { filePath: fullPath });
                } catch (err) {
                  console.error('SVG file check failed:', err);
                }

                // Fallback to placeholder if image fails to load
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="image-placeholder" style={{ display: imageSrc ? 'none' : 'flex' }}>
            {image.path.split(/[/\\]/).pop() || 'Image'}
          </div>
        </div>
      );
    });
  };

  const renderButtons = () => {
    return document.buttons.map((button, index) => {
      const isDraggingThis = isDragging && draggedElement?.type === 'button' && draggedElement?.index === index;

      let row = button.row;
      let col = button.column;

      // If dragging, show at new position
      if (isDraggingThis && dragEnd && dragOffset) {
        row = Math.max(1, dragEnd.row - dragOffset.y);
        col = Math.max(1, dragEnd.col - dragOffset.x);
      }

      const pos = getCellPosition(row, col);
      const rowSpan = button.row_span || 1;
      const colSpan = button.column_span || 1;
      const containerWidth = colSpan * CELL_SIZE + (colSpan - 1) * CELL_SPACING;
      const containerHeight = rowSpan * CELL_SIZE + (rowSpan - 1) * CELL_SPACING;
      const isSelected = selection?.type === 'button' && selection?.index === index;

      // Fill cell span with 10px margin from edges
      const margin = 10;
      const buttonWidth = containerWidth - (2 * margin);
      const buttonHeight = containerHeight - (2 * margin);
      const buttonLeft = pos.x + margin;
      const buttonTop = pos.y + margin;

      // Check if button is configured
      // Legacy buttons (from old VCP files) have name but no file property
      // New buttons have both name and file when configured
      const hasName = !!(button.name && button.name.trim() !== '');
      const hasFile = button.file !== undefined && button.file.trim() !== '';
      const isConfigured = hasName && (hasFile || button.file === undefined);  // Legacy format OR new format with file

      // Construct path to button SVG using default_image from XML if available
      // Otherwise fall back to buttonName.svg
      const imageName = button.default_image || `${button.name}.svg`;
      const buttonImageSrc = isConfigured
        ? getButtonAssetUrl(vcpResourcesFolder, button.name, imageName)
        : '';

      // If button has SVG, it will render with border from SVG, so no border/background needed
      const hasSvg = isConfigured && buttonImageSrc;

      return (
        <div
          key={`button-${index}`}
          className={`grid-button ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''} ${!isConfigured ? 'placeholder' : ''} ${hasSvg ? 'has-svg' : ''}`}
          onMouseEnter={() => setHoveredElement({ type: 'button', index })}
          onMouseLeave={() => setHoveredElement(null)}
          style={{
            left: buttonLeft,
            top: buttonTop,
            width: buttonWidth,
            height: buttonHeight,
            opacity: isDraggingThis ? 0.6 : 1,
            cursor: isDraggingThis ? 'grabbing' : 'grab',
          }}
        >
          {isConfigured && buttonImageSrc ? (
            <img
              key={`btn-${index}-${imageCacheBuster}`}
              src={buttonImageSrc}
              alt={button.name}
              className="button-image"
              onLoad={() => { /* button image loaded */ }}
              onError={(e) => {
                console.error('Failed to load button image:', button.name, 'path:', buttonImageSrc);
                // Fallback to text label if image fails to load
                e.currentTarget.style.display = 'none';
                const label = e.currentTarget.nextElementSibling as HTMLElement;
                if (label) label.style.display = 'block';
              }}
            />
          ) : null}
          <div className="button-label" style={{ display: (isConfigured && buttonImageSrc) ? 'none' : 'block' }}>
            {isConfigured ? button.name : (
              <>
                Button
                <br />
                (not configured)
              </>
            )}
          </div>
        </div>
      );
    });
  };

  const renderDragPreview = () => {
    // Show resize preview when resizing
    if (isResizing && resizeStart && dragEnd && resizeHandle && selection) {
      let newRow = resizeStart.row;
      let newCol = resizeStart.col;
      let newRowSpan = resizeStart.rowSpan;
      let newColSpan = resizeStart.colSpan;

      // Calculate preview dimensions based on handle
      switch (resizeHandle) {
        case 'se':
          newRowSpan = Math.max(1, dragEnd.row - resizeStart.row + 1);
          newColSpan = Math.max(1, dragEnd.col - resizeStart.col + 1);
          break;
        case 'e':
          newColSpan = Math.max(1, dragEnd.col - resizeStart.col + 1);
          break;
        case 's':
          newRowSpan = Math.max(1, dragEnd.row - resizeStart.row + 1);
          break;
        case 'sw':
          newRowSpan = Math.max(1, dragEnd.row - resizeStart.row + 1);
          newColSpan = Math.max(1, resizeStart.col + resizeStart.colSpan - dragEnd.col);
          newCol = Math.min(dragEnd.col, resizeStart.col + resizeStart.colSpan - 1);
          break;
        case 'w':
          newColSpan = Math.max(1, resizeStart.col + resizeStart.colSpan - dragEnd.col);
          newCol = Math.min(dragEnd.col, resizeStart.col + resizeStart.colSpan - 1);
          break;
        case 'nw':
          newRowSpan = Math.max(1, resizeStart.row + resizeStart.rowSpan - dragEnd.row);
          newRow = Math.min(dragEnd.row, resizeStart.row + resizeStart.rowSpan - 1);
          newColSpan = Math.max(1, resizeStart.col + resizeStart.colSpan - dragEnd.col);
          newCol = Math.min(dragEnd.col, resizeStart.col + resizeStart.colSpan - 1);
          break;
        case 'n':
          newRowSpan = Math.max(1, resizeStart.row + resizeStart.rowSpan - dragEnd.row);
          newRow = Math.min(dragEnd.row, resizeStart.row + resizeStart.rowSpan - 1);
          break;
        case 'ne':
          newRowSpan = Math.max(1, resizeStart.row + resizeStart.rowSpan - dragEnd.row);
          newRow = Math.min(dragEnd.row, resizeStart.row + resizeStart.rowSpan - 1);
          newColSpan = Math.max(1, dragEnd.col - resizeStart.col + 1);
          break;
      }

      const pos = getCellPosition(newRow, newCol);
      const width = newColSpan * CELL_SIZE + (newColSpan - 1) * CELL_SPACING;
      const height = newRowSpan * CELL_SIZE + (newRowSpan - 1) * CELL_SPACING;

      return (
        <div
          className="drag-preview valid"
          style={{
            left: pos.x,
            top: pos.y,
            width,
            height,
          }}
        >
          <div className="resize-dimensions">
            {newRowSpan} × {newColSpan}
          </div>
        </div>
      );
    }

    // Show drag preview when dragging
    if (!isDragging || !draggedElement || !dragEnd || !dragOffset) return null;

    // Calculate the target position
    const targetRow = Math.max(1, dragEnd.row - dragOffset.y);
    const targetCol = Math.max(1, dragEnd.col - dragOffset.x);

    // Get the span of the dragged element
    let rowSpan = 1;
    let colSpan = 1;

    if (draggedElement.type === 'border' && draggedElement.index !== undefined) {
      const border = document.borders[draggedElement.index];
      rowSpan = border.row_span;
      colSpan = border.column_span;
    } else if (draggedElement.type === 'image' && draggedElement.index !== undefined) {
      const image = document.images[draggedElement.index];
      rowSpan = image.row_span;
      colSpan = image.column_span;
    } else if (draggedElement.type === 'button' && draggedElement.index !== undefined) {
      const button = document.buttons[draggedElement.index];
      rowSpan = button.row_span || 1;
      colSpan = button.column_span || 1;
    }

    // Check if the target position is valid and not occupied
    const isValidPosition = targetRow >= 1 && targetCol >= 1 &&
      targetRow + rowSpan - 1 <= document.row_count &&
      targetCol + colSpan - 1 <= document.column_count;

    const targetOccupied = isValidPosition && isPositionOccupied(targetRow, targetCol, draggedElement);

    const pos = getCellPosition(targetRow, targetCol);
    const width = colSpan * CELL_SIZE + (colSpan - 1) * CELL_SPACING;
    const height = rowSpan * CELL_SIZE + (rowSpan - 1) * CELL_SPACING;

    return (
      <div
        className={`drag-preview ${targetOccupied ? 'occupied' : 'valid'}`}
        style={{
          left: pos.x,
          top: pos.y,
          width,
          height,
        }}
      />
    );
  };

  const [hoveredElement, setHoveredElement] = useState<{ type: string, index: number } | null>(null);

  const renderResizeHandles = () => {
    // Only show resize handles when hovering over a selected element
    if (!hoveredElement || !selection || selection.type === 'empty' || selection.index === undefined) return null;
    if (hoveredElement.type !== selection.type || hoveredElement.index !== selection.index) return null;
    if (isDragging || isResizing) return null; // Hide handles during drag/resize

    let row = selection.row || 1;
    let col = selection.column || 1;
    let rowSpan = 1;
    let colSpan = 1;

    if (selection.type === 'border') {
      const border = document.borders[selection.index];
      if (!border) return null; // Element no longer exists (e.g., after undo)
      row = border.row_start;
      col = border.column_start;
      rowSpan = border.row_span;
      colSpan = border.column_span;
    } else if (selection.type === 'image') {
      const image = document.images[selection.index];
      if (!image) return null; // Element no longer exists (e.g., after undo)
      row = image.row_start;
      col = image.column_start;
      rowSpan = image.row_span;
      colSpan = image.column_span;
    } else if (selection.type === 'button') {
      const button = document.buttons[selection.index];
      if (!button) return null; // Element no longer exists (e.g., after undo)
      row = button.row;
      col = button.column;
      rowSpan = button.row_span || 1;
      colSpan = button.column_span || 1;
    }

    const pos = getCellPosition(row, col);
    const width = colSpan * CELL_SIZE + (colSpan - 1) * CELL_SPACING;
    const height = rowSpan * CELL_SIZE + (rowSpan - 1) * CELL_SPACING;

    const handles = [
      { position: 'nw', cursor: 'nw-resize', top: -4, left: -4 },
      { position: 'n', cursor: 'n-resize', top: -4, left: width / 2 - 4 },
      { position: 'ne', cursor: 'ne-resize', top: -4, left: width - 4 },
      { position: 'e', cursor: 'e-resize', top: height / 2 - 4, left: width - 4 },
      { position: 'se', cursor: 'se-resize', top: height - 4, left: width - 4 },
      { position: 's', cursor: 's-resize', top: height - 4, left: width / 2 - 4 },
      { position: 'sw', cursor: 'sw-resize', top: height - 4, left: -4 },
      { position: 'w', cursor: 'w-resize', top: height / 2 - 4, left: -4 },
    ];

    return (
      <div
        className="resize-handles-container"
        style={{
          left: pos.x,
          top: pos.y,
        }}
      >
        {handles.map(({ position, cursor, top, left }) => (
          <div
            key={position}
            className="resize-handle"
            data-handle={position}
            style={{
              top,
              left,
              cursor,
            }}
          />
        ))}
      </div>
    );
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const menuItems: MenuItem[] = selection?.type === 'empty' ? [
      { id: 'add-border', label: 'Border', onClick: () => onAddBorder?.() },
      { id: 'add-image', label: 'Image', onClick: () => onAddImage?.() },
      { id: 'add-button', label: 'Button', onClick: () => onAddButton?.() },
      { id: 'separator-1', label: '', separator: true },
      { id: 'paste', label: 'Paste', disabled: !canPaste, onClick: () => onPaste?.() },
    ] : [
      { id: 'add-border', label: 'Border', onClick: () => onAddBorder?.() },
      { id: 'separator-1', label: '', separator: true },
      { id: 'cut', label: 'Cut', onClick: () => onCut?.() },
      { id: 'copy', label: 'Copy', onClick: () => onCopy?.() },
      { id: 'paste', label: 'Paste', disabled: !canPaste, onClick: () => onPaste?.() },
      { id: 'separator-2', label: '', separator: true },
      { id: 'delete', label: 'Delete', onClick: () => onDelete?.() },
    ];

    showContextMenu(menuItems, { x: e.clientX, y: e.clientY });
  };

  return (
    <div className="vcp-grid-container">
      <div
        className="vcp-grid"
        style={{
          width: gridWidth + 2 * OUTER_MARGIN,
          height: gridHeight + 2 * OUTER_MARGIN,
          backgroundColor: document.background,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <div
          className="grid-content"
          style={{
            position: 'relative',
            left: OUTER_MARGIN,
            top: OUTER_MARGIN,
            width: gridWidth,
            height: gridHeight,
          }}
        >
          {renderGrid()}
          {renderImages()}
          {renderButtons()}
          {renderBorders()}
          {renderDragPreview()}
          {renderResizeHandles()}
        </div>
      </div>
    </div>
  );
};

export default VcpGrid;
