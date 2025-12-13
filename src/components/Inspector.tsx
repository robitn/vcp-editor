import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import { VcpDocument, Selection } from "../types";
import "./Inspector.css";

interface InspectorProps {
  document: VcpDocument;
  selection: Selection | null;
  onDocumentChange: (document: VcpDocument) => void;
  onShowNotification?: (message: string, type: 'error' | 'warning' | 'success' | 'info') => void;
  onNewButton?: () => void;
  vcpResourcesFolder: string;
  defaultSaveLocation?: string;
}

const Inspector: React.FC<InspectorProps> = ({
  document,
  selection,
  onDocumentChange,
  onShowNotification,
  onNewButton,
  vcpResourcesFolder,
  defaultSaveLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'border' | 'image' | 'button'>('background');
  const [columnInput, setColumnInput] = useState(document.column_count.toString());
  const [rowInput, setRowInput] = useState(document.row_count.toString());

  // Auto-switch tab based on selection
  useEffect(() => {
    if (selection) {
      if (selection.type === 'border') {
        setActiveTab('border');
      } else if (selection.type === 'image') {
        setActiveTab('image');
      } else if (selection.type === 'button') {
        setActiveTab('button');
      } else if (selection.type === 'empty') {
        setActiveTab('background');
      }
    }
  }, [selection]);

  // Sync input values when document changes externally
  useEffect(() => {
    setColumnInput(document.column_count.toString());
    setRowInput(document.row_count.toString());
  }, [document.column_count, document.row_count]);

  const updateDocument = (updates: Partial<VcpDocument>) => {
    onDocumentChange({ ...document, ...updates });
  };

  const checkElementsInColumn = (column: number): string[] => {
    const affected: string[] = [];
    // Convert to 1-based indexing (data uses 1-based from XML)
    const col1Based = column + 1;

    // Check borders
    document.borders.forEach((border, idx) => {
      const endCol = border.column_start + (border.column_span || 1) - 1;
      if (border.column_start === col1Based || (border.column_start < col1Based && endCol >= col1Based)) {
        affected.push(`Border ${idx + 1}`);
      }
    });

    // Check images
    document.images.forEach((image, idx) => {
      const endCol = image.column_start + (image.column_span || 1) - 1;
      if (image.column_start === col1Based || (image.column_start < col1Based && endCol >= col1Based)) {
        affected.push(`Image ${idx + 1}`);
      }
    });

    // Check buttons
    document.buttons.forEach((button, idx) => {
      const endCol = button.column + (button.column_span || 1) - 1;
      if (button.column === col1Based || (button.column < col1Based && endCol >= col1Based)) {
        affected.push(`Button ${idx + 1}`);
      }
    });

    return affected;
  };

  const checkElementsInRow = (row: number): string[] => {
    const affected: string[] = [];
    // Convert to 1-based indexing (data uses 1-based from XML)
    const row1Based = row + 1;

    // Check borders
    document.borders.forEach((border, idx) => {
      const endRow = border.row_start + (border.row_span || 1) - 1;
      if (border.row_start === row1Based || (border.row_start < row1Based && endRow >= row1Based)) {
        affected.push(`Border ${idx + 1}`);
      }
    });

    // Check images
    document.images.forEach((image, idx) => {
      const endRow = image.row_start + (image.row_span || 1) - 1;
      if (image.row_start === row1Based || (image.row_start < row1Based && endRow >= row1Based)) {
        affected.push(`Image ${idx + 1}`);
      }
    });

    // Check buttons
    document.buttons.forEach((button, idx) => {
      const endRow = button.row + (button.row_span || 1) - 1;
      if (button.row === row1Based || (button.row < row1Based && endRow >= row1Based)) {
        affected.push(`Button ${idx + 1}`);
      }
    });

    return affected;
  };

  const handleColumnCountChange = (newCount: number) => {
    const validCount = Math.max(6, newCount || 6);

    // Check if reducing columns would affect elements
    if (validCount < document.column_count) {
      // Check each column that would be removed (0-indexed, so column_count-1 is last column)
      for (let col = validCount; col < document.column_count; col++) {
        const affected = checkElementsInColumn(col);
        if (affected.length > 0) {
          if (onShowNotification) {
            onShowNotification(
              `Cannot remove column ${col + 1}: Contains ${affected.join(', ')}. Delete these elements first.`,
              'error'
            );
          }
          // Reset input to current value
          setColumnInput(document.column_count.toString());
          return;
        }
      }
    }

    setColumnInput(validCount.toString());
    updateDocument({ column_count: validCount });
  };

  const handleRowCountChange = (newCount: number) => {
    const validCount = Math.max(14, newCount || 14);

    // Check if reducing rows would affect elements
    if (validCount < document.row_count) {
      // Check each row that would be removed (0-indexed, so row_count-1 is last row)
      for (let row = validCount; row < document.row_count; row++) {
        const affected = checkElementsInRow(row);
        if (affected.length > 0) {
          if (onShowNotification) {
            onShowNotification(
              `Cannot remove row ${row + 1}: Contains ${affected.join(', ')}. Delete these elements first.`,
              'error'
            );
          }
          // Reset input to current value
          setRowInput(document.row_count.toString());
          return;
        }
      }
    }

    setRowInput(validCount.toString());
    updateDocument({ row_count: validCount });
  };

  const renderBackgroundTab = () => {
    return (
      <div className="inspector-content">
        <h3>Grid Settings</h3>
        <div className="form-group">
          <label>Columns:</label>
          <input
            type="number"
            min="6"
            value={columnInput}
            onChange={(e) => {
              setColumnInput(e.target.value);
              handleColumnCountChange(parseInt(e.target.value));
            }}
            onBlur={() => setColumnInput(document.column_count.toString())}
          />
        </div>
        <div className="form-group">
          <label>Rows:</label>
          <input
            type="number"
            min="14"
            value={rowInput}
            onChange={(e) => {
              setRowInput(e.target.value);
              handleRowCountChange(parseInt(e.target.value));
            }}
            onBlur={() => setRowInput(document.row_count.toString())}
          />
        </div>
        <div className="form-group">
          <label>Background Color:</label>
          <input
            type="color"
            value={document.background}
            onChange={(e) => updateDocument({ background: e.target.value })}
          />
          <input
            type="text"
            value={document.background}
            onChange={(e) => updateDocument({ background: e.target.value })}
            placeholder="#E9E0B7"
          />
        </div>
      </div>
    );
  };

  const renderBorderTab = () => {
    if (!selection || selection.type !== 'border' || selection.index === undefined) {
      return (
        <div className="inspector-content">
          <p className="no-selection">Select a border to edit its properties</p>
        </div>
      );
    }

    const border = document.borders[selection.index];

    const updateBorder = (updates: any) => {
      const newBorders = [...document.borders];
      newBorders[selection.index!] = { ...border, ...updates };
      updateDocument({ borders: newBorders });
    };

    return (
      <div className="inspector-content">
        <h3>Border Properties</h3>
        <div className="form-group">
          <label>Row Start:</label>
          <input
            type="number"
            min="1"
            max={document.row_count}
            value={border.row_start}
            onChange={(e) => updateBorder({ row_start: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Column Start:</label>
          <input
            type="number"
            min="1"
            max={document.column_count}
            value={border.column_start}
            onChange={(e) => updateBorder({ column_start: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Row Span:</label>
          <input
            type="number"
            min="1"
            value={border.row_span}
            onChange={(e) => updateBorder({ row_span: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Column Span:</label>
          <input
            type="number"
            min="1"
            value={border.column_span}
            onChange={(e) => updateBorder({ column_span: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Fill Color:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={border.fill === 'Transparent' ? '#ffffff' : border.fill}
              onChange={(e) => updateBorder({ fill: e.target.value })}
              style={{ cursor: 'pointer' }}
            />
            <button
              onClick={() => updateBorder({ fill: border.fill === 'Transparent' ? '#ffffff' : 'Transparent' })}
              style={{
                padding: '6px 12px',
                backgroundColor: border.fill === 'Transparent' ? '#007bff' : '#f0f0f0',
                color: border.fill === 'Transparent' ? 'white' : '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: border.fill === 'Transparent' ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              Transparent
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Outline Color:</label>
          <input
            type="color"
            value={border.outline_color}
            onChange={(e) => updateBorder({ outline_color: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Outline Thickness:</label>
          <input
            type="number"
            min="1"
            max="4"
            value={border.outline_thickness}
            onChange={(e) => updateBorder({ outline_thickness: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>
    );
  };

  const renderImageTab = () => {
    if (!selection || selection.type !== 'image' || selection.index === undefined) {
      return (
        <div className="inspector-content">
          <p className="no-selection">Select an image to edit its properties</p>
        </div>
      );
    }

    const image = document.images[selection.index];

    const updateImage = (updates: any) => {
      const newImages = [...document.images];
      newImages[selection.index!] = { ...image, ...updates };
      updateDocument({ images: newImages });
    };

    const handleBrowseImage = async () => {
      try {
        // Default to images folder based on settings hierarchy
        let defaultPath: string | undefined;

        if (defaultSaveLocation && defaultSaveLocation.trim() !== '') {
          defaultPath = await join(defaultSaveLocation, 'images');
        } else if (vcpResourcesFolder) {
          defaultPath = `${vcpResourcesFolder}/images`;
        }

        const filePath = await open({
          filters: [{ name: "SVG Images", extensions: ["svg"] }],
          multiple: false,
          defaultPath,
        });
        if (filePath) {
          const sourcePath = filePath as string;
          const filename = sourcePath.split(/[/\\]/).pop() || '';

          if (!filename) {
            onShowNotification?.('Invalid file selected', 'error');
            return;
          }

          if (!vcpResourcesFolder) {
            onShowNotification?.('Please configure VCP Resources Folder in Settings first', 'warning');
            return;
          }

          const imagesFolder = `${vcpResourcesFolder}/images`;

          // Copy file to images folder
          await invoke('copy_file_to_button_folder', {
            sourcePath,
            buttonFolder: imagesFolder,
            newFilename: filename,
          });

          // Store relative path only
          const relativePath = `images/${filename}`;
          updateImage({ path: relativePath });
          onShowNotification?.(`Image copied to images folder`, 'success');
        }
      } catch (error) {
        console.error("Failed to select image:", error);
        onShowNotification?.(`Failed to copy image: ${error}`, 'error');
      }
    };

    return (
      <div className="inspector-content">
        <h3>Image Properties</h3>
        <div className="form-group">
          <label>Path:</label>
          <input
            type="text"
            value={image.path}
            onChange={(e) => updateImage({ path: e.target.value })}
            placeholder="images/filename.svg"
          />
          <button className="browse-button" onClick={handleBrowseImage}>Browse...</button>
        </div>
        <div className="form-group">
          <label>Row Start:</label>
          <input
            type="number"
            min="1"
            value={image.row_start}
            onChange={(e) => updateImage({ row_start: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Column Start:</label>
          <input
            type="number"
            min="1"
            value={image.column_start}
            onChange={(e) => updateImage({ column_start: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Row Span:</label>
          <input
            type="number"
            min="1"
            value={image.row_span}
            onChange={(e) => updateImage({ row_span: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Column Span:</label>
          <input
            type="number"
            min="1"
            value={image.column_span}
            onChange={(e) => updateImage({ column_span: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>
    );
  };

  const renderButtonTab = () => {
    if (!selection || selection.type !== 'button' || selection.index === undefined) {
      return (
        <div className="inspector-content">
          <p className="no-selection">Select a button to edit its properties</p>
        </div>
      );
    }

    const button = document.buttons[selection.index];

    const updateButton = (updates: any) => {
      const newButtons = [...document.buttons];
      newButtons[selection.index!] = { ...button, ...updates };
      updateDocument({ buttons: newButtons });
    };

    // const handleBrowseButtonFolder = async () => {
    //   try {
    //     const folderPath = await open({
    //       directory: true,
    //       multiple: false,
    //     });
    //     if (folderPath) {
    //       // Extract the folder name from the path
    //       const pathStr = folderPath as string;
    //       const folderName = pathStr.split('/').pop() || pathStr.split('\\').pop() || pathStr;
    //       updateButton({ name: folderName });
    //     }
    //   } catch (error) {
    //     console.error("Failed to select folder:", error);
    //   }
    // };

    return (
      <div className="inspector-content">
        <h3>Button Properties</h3>
        <div className="form-group">
          <label>Button Name:</label>
          <input
            type="text"
            value={button.name || ''}
            onChange={(e) => updateButton({ name: e.target.value })}
            placeholder="(not configured)"
            readOnly
          />
        </div>
        <div className="form-group">
          <label>XML File:</label>
          <input
            type="text"
            value={button.file || ''}
            placeholder="(not configured)"
            readOnly
          />
        </div>
        {onNewButton && (
          <button className="new-button-btn" onClick={onNewButton}>
            Open Button Editor...
          </button>
        )}
        <div className="form-group">
          <label>Row:</label>
          <input
            type="number"
            min="1"
            value={button.row}
            onChange={(e) => updateButton({ row: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Column:</label>
          <input
            type="number"
            min="1"
            value={button.column}
            onChange={(e) => updateButton({ column: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Row Span:</label>
          <input
            type="number"
            min="1"
            value={button.row_span || 1}
            onChange={(e) => updateButton({ row_span: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label>Column Span:</label>
          <input
            type="number"
            min="1"
            value={button.column_span || 1}
            onChange={(e) => updateButton({ column_span: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="inspector">
      <div className="inspector-tabs">
        <button
          className={`tab ${activeTab === 'background' ? 'active' : ''}`}
          onClick={() => setActiveTab('background')}
        >
          Background
        </button>
        <button
          className={`tab ${activeTab === 'border' ? 'active' : ''}`}
          onClick={() => setActiveTab('border')}
        >
          Border
        </button>
        <button
          className={`tab ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          Image
        </button>
        <button
          className={`tab ${activeTab === 'button' ? 'active' : ''}`}
          onClick={() => setActiveTab('button')}
        >
          Button
        </button>
      </div>
      <div className="inspector-body">
        {activeTab === 'background' && renderBackgroundTab()}
        {activeTab === 'border' && renderBorderTab()}
        {activeTab === 'image' && renderImageTab()}
        {activeTab === 'button' && renderButtonTab()}
      </div>
    </div>
  );
};

export default Inspector;
