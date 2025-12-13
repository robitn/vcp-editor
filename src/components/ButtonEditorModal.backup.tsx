import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { VcpButtonDefinition, createDefaultButton, generateButtonXML, validateButton, parseButtonXML } from '../buttonDefinition';
import { SKIN_EVENTS } from '../vcpEventData';
import './ButtonEditorModal.css';

interface ButtonEditorModalProps {
  onClose: () => void;
  onSave: (buttonName: string) => void;
  vcpResourcesFolder: string;
  defaultSaveLocation?: string;
  existingButton?: {
    name: string;
    file: string;
  };
}

// Small helper to normalize file paths (Windows -> forward slashes) and return a converted asset URL
const toAssetSrc = (p: string) => {
  if (!p) return '';
  try {
    let np = p.replace(/\\/g, '/');
    np = np.replace(/\/+/g, '/');
    np = np.trim();

    if (np.startsWith('file://')) {
      np = np.replace(/^file:+\/*/, '');
    }

    
    return convertFileSrc(np);
  } catch (err) {
    console.error('toAssetSrc error for path', p, err);
    return '';
  }
};

// Sanitize button name: replace spaces/special chars with underscore
function sanitizeButtonName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_') // Remove consecutive underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Syntax highlight XML for preview
function highlightXML(xml: string): string {
  // Escape HTML entities first
  let highlighted = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split by lines to process each line
  const lines = highlighted.split('\n');
  const processedLines = lines.map(line => {
    // Match opening/closing tags with or without content
    return line.replace(/(&lt;\/?)(\w+)(&gt;)/g, (_match, open, tagName, close) => {
      return `${open}<span class="xml-tag">${tagName}</span>${close}`;
    })
      // Highlight text content between tags (but not whitespace-only)
      .replace(/(&gt;)([^&\s][^&]*?)(&lt;)/g, (_match, openBracket, content, closeBracket) => {
        return `${openBracket}<span class="xml-text">${content}</span>${closeBracket}`;
      });
  });

  return processedLines.join('\n');
}

export default function ButtonEditorModal({ onClose, onSave, vcpResourcesFolder, defaultSaveLocation, existingButton }: ButtonEditorModalProps) {
  const [buttonName, setButtonName] = useState(existingButton?.name || '');
  const [sanitizedName, setSanitizedName] = useState(existingButton?.name || '');
  const [isExpanded, setIsExpanded] = useState(false);  // Don't auto-expand - let user browse first
  const [buttonDef, setButtonDef] = useState<VcpButtonDefinition | null>(null);
  const [buttonFolder, setButtonFolder] = useState('');
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [xmlPreview, setXmlPreview] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewState, setPreviewState] = useState<'default' | 'pressed' | 'output-on' | 'output-off' | 'input-active' | 'input-inactive'>('default');

  // Handle ESC key to close modal (acts as Cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load existing button on mount if provided - just set name, don't auto-load
  useEffect(() => {
    if (existingButton) {
      // Just populate the button name field, don't expand or load
      setButtonName(existingButton.name);
      setSanitizedName(existingButton.name);
    }
  }, [existingButton]);

  // Update preview whenever button folder, definition, or preview state changes
  useEffect(() => {
    if (isExpanded && previewState && buttonFolder && buttonDef) {
      updatePreviewForState(previewState);
    }
  }, [buttonFolder, buttonDef, previewState, isExpanded]);

  const handleNameChange = (value: string) => {
    setButtonName(value);
    setSanitizedName(sanitizeButtonName(value));
  };

  const handleCreateButton = async () => {
    if (!sanitizedName || !vcpResourcesFolder) return;

    try {
      // Create button folder (or get existing)
      const folder = await invoke<string>('create_button_folder', {
        vcpResourcesFolder,
        buttonName: sanitizedName,
      });

      setButtonFolder(folder);

      // Check if XML file already exists for this button
      let def: VcpButtonDefinition;
      let xmlContent: string;

      try {
        const xml = await invoke<string>('load_button_xml', {
          vcpResourcesFolder,
          buttonName: sanitizedName,
        });

        // found existing XML for button

        // Parse existing XML
        def = parseButtonXML(xml);
        def.name = sanitizedName;
        def.defaultImage = `${sanitizedName}.svg`;
        xmlContent = xml;
      } catch (error) {
        // No existing XML, create default
        // creating default XML for button
        def = createDefaultButton(sanitizedName);
        xmlContent = generateButtonXML(def);
      }

      setButtonDef(def);
      setXmlPreview(xmlContent);
      setWarnings(validateButton(def));

      // Check if SVG already exists and set preview
      const imagePath = `${folder}/${sanitizedName}.svg`;
      const previewSrc = toAssetSrc(imagePath);
      setPreviewImageSrc(previewSrc);
      // preview image path prepared

      // Expand the dialog
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to create button:', error);
      alert(`Error: ${error}`);
    }
  };

  const handleBrowseImage = async () => {
    if (!buttonDef || !sanitizedName) return;
    if (!buttonFolder && !defaultSaveLocation && !vcpResourcesFolder) return;

    try {
      // Determine browse location
      let defaultPath = buttonFolder;
      if (!defaultPath && defaultSaveLocation) {
        defaultPath = await join(defaultSaveLocation, 'Buttons');
      } else if (!defaultPath && vcpResourcesFolder) {
        defaultPath = await join(vcpResourcesFolder, 'Buttons');
      }

      const selected = await open({
        filters: [{ name: 'SVG Images', extensions: ['svg'] }],
        multiple: false,
        title: 'Select Button Image',
        defaultPath,
      });

      if (selected) {
        const sourcePath = selected as string;
        // Use button name for default image (CNC VCP requirement)
        const filename = `${sanitizedName}.svg`;

        // Copy file to button folder
        await invoke<string>('copy_file_to_button_folder', {
          sourcePath,
          buttonFolder,
          newFilename: filename,
        });

        // file copied successfully

        // Update button definition
        const updated = { ...buttonDef, defaultImage: filename };
        setButtonDef(updated);
        setXmlPreview(generateButtonXML(updated));
        setWarnings(validateButton(updated));

        // Update preview with cache-busting timestamp to force reload
        const imagePath = `${buttonFolder}/${filename}`;
        const cacheBuster = `?t=${Date.now()}`;
        setPreviewImageSrc(toAssetSrc(imagePath) + cacheBuster);
      }
    } catch (error) {
      console.error('Failed to browse image:', error);
      alert(`Error: ${error}`);
    }
  };

  const updatePreviewForState = (state: typeof previewState) => {
    if (!buttonFolder || !sanitizedName || !buttonDef) return;

    let imageName = `${sanitizedName}.svg`; // default

    switch (state) {
      case 'pressed':
        imageName = buttonDef.onClickSwap || `${sanitizedName}.svg`;
        break;
      case 'output-on':
        imageName = buttonDef.plcOutput?.imageOn || `${sanitizedName}.svg`;
        break;
      case 'output-off':
        imageName = buttonDef.plcOutput?.imageOff || `${sanitizedName}.svg`;
        break;
      case 'input-active':
        imageName = buttonDef.plcInput?.imageActive || `${sanitizedName}.svg`;
        break;
      case 'input-inactive':
        imageName = buttonDef.plcInput?.imageInactive || `${sanitizedName}.svg`;
        break;
      default:
        imageName = buttonDef.defaultImage || `${sanitizedName}.svg`;
    }

    const imagePath = `${buttonFolder}/${imageName}`;
    setPreviewImageSrc(toAssetSrc(imagePath));
  };

  const handleSave = async () => {
    if (!sanitizedName || !buttonFolder || !buttonDef) return;

    try {
      // Save button XML
      const xml = generateButtonXML(buttonDef);
      await invoke('save_button_xml', {
        buttonFolder,
        buttonName: sanitizedName,
        xmlContent: xml,
      });

      onSave(sanitizedName);
    } catch (error) {
      console.error('Failed to save button:', error);
      alert(`Error: ${error}`);
    }
  };

  return (
    <div className="button-editor-overlay">
      <div
        className={`button-editor-modal ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {/* Header with name input (only for new buttons) */}
        {!existingButton && (
          <div className="button-editor-header">
            <div className="button-name-input-row">
              <label>Enter button name:</label>
              <input
                type="text"
                value={buttonName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isExpanded && sanitizedName) {
                    e.preventDefault();
                    handleCreateButton();
                  }
                }}
                placeholder="e.g., Cycle Start"
                autoFocus
              />
              {!isExpanded && (
                <>
                  <button
                    className="button-editor-browse-btn"
                    onClick={async () => {
                      try {
                        const selected = await open({
                          directory: true,
                          defaultPath: `${vcpResourcesFolder}/Buttons`,
                          title: 'Select Existing Button Folder',
                        });

                        if (selected) {
                          const folderPath = selected as string;
                          // Extract button name from folder path
                          const buttonName = folderPath.split('/').pop() || '';
                          setButtonName(buttonName);
                          setSanitizedName(buttonName);
                        }
                      } catch (error) {
                        console.error('Failed to browse buttons:', error);
                        alert(`Error: ${error}`);
                      }
                    }}
                    title="Browse existing buttons"
                  >
                    Browse
                  </button>
                  <button
                    className="button-editor-ok-btn"
                    onClick={handleCreateButton}
                    disabled={!sanitizedName}
                  >
                    OK
                  </button>
                </>
              )}
              <button className="button-editor-close" onClick={onClose}>×</button>
            </div>
            {sanitizedName && sanitizedName !== buttonName && (
              <div className="button-name-preview">
                Folder/file name: <code>{sanitizedName}</code>
              </div>
            )}
          </div>
        )}

        {/* Header for existing buttons: show editable name so it populates on open, but keep collapsed until OK/Open */}
        {existingButton && (
          <div className="button-editor-header">
            <div className="button-name-input-row">
              <label>Button:</label>
              <input
                type="text"
                value={buttonName}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isExpanded && sanitizedName) {
                    e.preventDefault();
                    handleCreateButton();
                  }
                }}
                placeholder="e.g., Cycle Start"
              />
              {!isExpanded && (
                <>
                  <button
                    className="button-editor-browse-btn"
                    onClick={async () => {
                      try {
                        const selected = await open({
                          directory: true,
                          defaultPath: `${vcpResourcesFolder}/Buttons`,
                          title: 'Select Existing Button Folder',
                        });

                        if (selected) {
                          const folderPath = selected as string;
                          // Extract button name from folder path
                          const buttonName = folderPath.split('/').pop() || '';
                          setButtonName(buttonName);
                          setSanitizedName(buttonName);
                        }
                      } catch (error) {
                        console.error('Failed to browse buttons:', error);
                        alert(`Error: ${error}`);
                      }
                    }}
                    title="Browse existing buttons"
                  >
                    Browse
                  </button>
                  <button
                    className="button-editor-ok-btn"
                    onClick={handleCreateButton}
                    disabled={!sanitizedName}
                  >
                    Open
                  </button>
                </>
              )}
              <button className="button-editor-close" onClick={onClose}>×</button>
            </div>
            {sanitizedName && sanitizedName !== buttonName && (
              <div className="button-name-preview">
                Folder/file name: <code>{sanitizedName}</code>
              </div>
            )}
          </div>
        )}

        {/* Expanded content (hidden until OK is clicked) */}
        {isExpanded && buttonDef && (
          <div className="button-editor-content">
            <div className="button-editor-top">
              <div className="button-preview-canvas">
                {previewImageSrc ? (
                  <img src={previewImageSrc} alt="Button preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div className="preview-placeholder">
                    Button Preview
                    <br />
                    <small>240px × 240px</small>
                  </div>
                )}
              </div>

              <div className="button-state-toggles">
                <button
                  className={`state-toggle ${previewState === 'default' ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewState('default');
                    updatePreviewForState('default');
                  }}
                >
                  Default
                </button>
                <button
                  className={`state-toggle ${previewState === 'pressed' ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewState('pressed');
                    updatePreviewForState('pressed');
                  }}
                >
                  Pressed
                </button>
                <button
                  className={`state-toggle ${previewState === 'output-on' ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewState('output-on');
                    updatePreviewForState('output-on');
                  }}
                  disabled={!buttonDef.plcOutput}
                >
                  Out:ON
                </button>
                <button
                  className={`state-toggle ${previewState === 'output-off' ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewState('output-off');
                    updatePreviewForState('output-off');
                  }}
                  disabled={!buttonDef.plcOutput}
                >
                  Out:OFF
                </button>
                <button
                  className={`state-toggle ${previewState === 'input-active' ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewState('input-active');
                    updatePreviewForState('input-active');
                  }}
                  disabled={!buttonDef.plcInput}
                >
                  In:Active
                </button>
                <button
                  className={`state-toggle ${previewState === 'input-inactive' ? 'active' : ''}`}
                  onClick={() => {
                    setPreviewState('input-inactive');
                    updatePreviewForState('input-inactive');
                  }}
                  disabled={!buttonDef.plcInput}
                >
                  In:Inactive
                </button>
              </div>
            </div>

            <div className="button-editor-middle">
              <div className="button-editor-left-panel">
                <h3>Appearance</h3>
                <div className="editor-section">
                  <label>Default Image:</label>
                  <div className="image-input-row">
                    <input
                      type="text"
                      value={buttonDef.defaultImage}
                      readOnly
                      placeholder={`${sanitizedName}.svg`}
                    />
                    <button onClick={handleBrowseImage}>Browse</button>
                  </div>
                </div>
                <div className="editor-section">
                  <label>On Click Swap (Press State Image):</label>
                  <div className="image-input-row">
                    <input
                      type="text"
                      value={buttonDef.onClickSwap || ''}
                      placeholder="image_pressed.svg (optional)"
                      onChange={(e) => {
                        const updated = { ...buttonDef, onClickSwap: e.target.value || undefined };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                    />
                    <button onClick={async () => {
                      try {
                        const selected = await open({
                          filters: [{ name: 'SVG Images', extensions: ['svg'] }],
                          multiple: false,
                          title: 'Select Press State Image',
                        });
                        if (selected) {
                          const sourcePath = selected as string;
                          const filename = sourcePath.split('/').pop() || '';
                          await invoke('copy_file_to_button_folder', {
                            sourcePath,
                            buttonFolder,
                            newFilename: filename,
                          });
                          const updated = { ...buttonDef, onClickSwap: filename };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }
                      } catch (error) {
                        console.error('Failed to browse image:', error);
                        alert(`Error: ${error}`);
                      }
                    }}>Browse</button>
                  </div>
                </div>
              </div>

              <div className="button-editor-right-panel">
                <h3>Behavior</h3>
                <div className="editor-section">
                  <label>Skin Event:</label>
                  <select
                    value={buttonDef.skinEventNum || ''}
                    onChange={(e) => {
                      const updated = { ...buttonDef, skinEventNum: e.target.value ? Number(e.target.value) : undefined };
                      setButtonDef(updated);
                      setXmlPreview(generateButtonXML(updated));
                      setWarnings(validateButton(updated));
                    }}
                  >
                    <option value="">None</option>
                    {[...SKIN_EVENTS].sort((a, b) => a.displayName.localeCompare(b.displayName)).map(event => (
                      <option key={event.id} value={event.id}>
                        {event.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <h3 style={{ marginTop: '24px' }}>Execution (choose one)</h3>
                <div className="editor-section">
                  <label>
                    <input
                      type="radio"
                      name="execution-type"
                      checked={!buttonDef.run && !buttonDef.app}
                      onChange={() => {
                        const updated = { ...buttonDef, run: undefined, app: undefined };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                    />
                    {' '}None
                  </label>
                </div>

                <div className="editor-section">
                  <label>
                    <input
                      type="radio"
                      name="execution-type"
                      checked={!!buttonDef.run && buttonDef.run.type === 'line'}
                      onChange={() => {
                        const updated = { ...buttonDef, run: { type: 'line' as const, value: '' }, app: undefined };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                    />
                    {' '}Run Line
                  </label>
                  {buttonDef.run && buttonDef.run.type === 'line' && (
                    <input
                      type="text"
                      value={buttonDef.run.value}
                      placeholder="Command line to execute"
                      onChange={(e) => {
                        const updated = { ...buttonDef, run: { type: 'line' as const, value: e.target.value } };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                      style={{ marginLeft: '8px', marginTop: '8px' }}
                    />
                  )}
                </div>

                <div className="editor-section">
                  <label>
                    <input
                      type="radio"
                      name="execution-type"
                      checked={!!buttonDef.run && buttonDef.run.type === 'macro'}
                      onChange={() => {
                        const updated = { ...buttonDef, run: { type: 'macro' as const, value: '' }, app: undefined };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                    />
                    {' '}Run Macro
                  </label>
                  {buttonDef.run && buttonDef.run.type === 'macro' && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        value={buttonDef.run.value}
                        placeholder="Macro to execute"
                        onChange={(e) => {
                          const updated = { ...buttonDef, run: { type: 'macro' as const, value: e.target.value } };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="button-editor-browse-btn"
                        onClick={async () => {
                          try {
                            const selected = await open({
                              title: 'Select Macro File',
                              multiple: false,
                            });
                            if (selected) {
                              const filepath = selected as string;
                              const updated = { ...buttonDef, run: { type: 'macro' as const, value: filepath } };
                              setButtonDef(updated);
                              setXmlPreview(generateButtonXML(updated));
                              setWarnings(validateButton(updated));
                            }
                          } catch (error) {
                            console.error('Failed to browse macro:', error);
                            alert(`Error: ${error}`);
                          }
                        }}>Browse</button>
                    </div>
                  )}
                </div>

                <div className="editor-section">
                  <label>
                    <input
                      type="radio"
                      name="execution-type"
                      checked={!!buttonDef.app}
                      onChange={() => {
                        const updated = { ...buttonDef, run: undefined, app: '' };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                    />
                    {' '}Launch App
                  </label>
                  {buttonDef.app !== undefined && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        value={buttonDef.app}
                        placeholder="Application to launch"
                        onChange={(e) => {
                          const updated = { ...buttonDef, app: e.target.value || undefined };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="button-editor-browse-btn"
                        onClick={async () => {
                          try {
                            const selected = await open({
                              title: 'Select Application',
                              multiple: false,
                            });
                            if (selected) {
                              const filepath = selected as string;
                              const updated = { ...buttonDef, app: filepath };
                              setButtonDef(updated);
                              setXmlPreview(generateButtonXML(updated));
                              setWarnings(validateButton(updated));
                            }
                          } catch (error) {
                            console.error('Failed to browse app:', error);
                            alert(`Error: ${error}`);
                          }
                        }}>Browse</button>
                    </div>
                  )}
                </div>

                <h3 style={{ marginTop: '24px' }}>PLC Behavior (choose one)</h3>
                <div className="editor-section">
                  <label>
                    <input
                      type="radio"
                      name="plc-behavior"
                      checked={!buttonDef.plcOutput && !buttonDef.plcInput}
                      onChange={() => {
                        const updated = {
                          ...buttonDef,
                          plcOutput: undefined,
                          plcInput: undefined
                        };
                        setButtonDef(updated);
                        setXmlPreview(generateButtonXML(updated));
                        setWarnings(validateButton(updated));
                      }}
                    />
                    {' '}None
                  </label>
                </div>

                <div className="editor-section">
                  <label>
                    <input
                      type="radio"
                      name="plc-behavior"
                      checked={!!buttonDef.plcOutput}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const updated = {
                            ...buttonDef,
                            plcOutput: { number: 1, colorOn: '#EC1C24', colorOff: '#81151C' },
                            plcInput: undefined
                          };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }
                      }}
                    />
                    {' '}PLC Output
                  </label>
                </div>

                {/* rest unchanged... */}
              </div>
            </div>

            <div className="button-editor-bottom">
              <div className="xml-preview-header">
                <h4>XML Preview</h4>
                {warnings.length > 0 && (
                  <div className="xml-warnings">
                    {warnings.map((warning, i) => (
                      <div key={i} className="warning-item">⚠️ {warning}</div>
                    ))}
                  </div>
                )}
              </div>
              <pre className="xml-preview-content" dangerouslySetInnerHTML={{ __html: highlightXML(xmlPreview) }} />
            </div>

            <div className="button-editor-footer">
              <button className="editor-button editor-button-default" onClick={onClose}>
                Cancel
              </button>
              <button className="editor-button editor-button-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
