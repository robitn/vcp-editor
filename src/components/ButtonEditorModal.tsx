import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { VcpButtonDefinition, createDefaultButton, generateButtonXML, validateButton, parseButtonXML } from '../buttonDefinition';
import { SKIN_EVENTS, PLC_INPUTS } from '../vcpEventData';
import './ButtonEditorModal.css';

interface ButtonEditorModalProps {
  onClose: () => void;
  onSave: (buttonName: string) => void;
  vcpResourcesFolder: string;
  existingButton?: {
    name: string;
    file: string;
  };
}

// Sanitize button name: lowercase, replace spaces/special chars with underscore
function sanitizeButtonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
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
    .replace(/(&gt;)([^&\s][^&]*)(&lt;)/g, (_match, openBracket, content, closeBracket) => {
      return `${openBracket}<span class="xml-text">${content}</span>${closeBracket}`;
    });
  });
  
  return processedLines.join('\n');
}

export default function ButtonEditorModal({ onClose, onSave, vcpResourcesFolder, existingButton }: ButtonEditorModalProps) {
  const [buttonName, setButtonName] = useState(existingButton?.name || '');
  const [sanitizedName, setSanitizedName] = useState(existingButton?.name || '');
  const [isExpanded, setIsExpanded] = useState(!!existingButton);  // Auto-expand if editing existing button
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

  // Load existing button on mount if provided
  useEffect(() => {
    if (existingButton && vcpResourcesFolder) {
      loadExistingButton();
    }
  }, []);

  const loadExistingButton = async () => {
    console.log('loadExistingButton called with:', existingButton, vcpResourcesFolder);
    if (!existingButton || !vcpResourcesFolder) return;

    try {
      // Set button folder
      const folder = `${vcpResourcesFolder}/Buttons/${existingButton.name}`;
      setButtonFolder(folder);
      
      // If button has XML file, load it
      if (existingButton.file) {
        console.log('Loading XML for button:', existingButton.name);
        const xml = await invoke<string>('load_button_xml', {
          vcpResourcesFolder,
          buttonName: existingButton.name,
        });
        
        console.log('Loaded XML:', xml);
        
        // Parse XML to button definition
        const def = parseButtonXML(xml);
        console.log('Parsed definition:', def);
        
        // Set name and default image from existing button
        def.name = existingButton.name;
        def.defaultImage = `${existingButton.name}.svg`;
        
        setButtonDef(def);
        setXmlPreview(xml);
        setWarnings(validateButton(def));
        
        // Load preview image
        const imagePath = `${folder}/${existingButton.name}.svg`;
        setPreviewImageSrc(convertFileSrc(imagePath));
      } else {
        // Legacy button without XML - initialize with defaults
        const def = createDefaultButton(existingButton.name);
        setButtonDef(def);
        setXmlPreview(generateButtonXML(def));
        setWarnings(validateButton(def));
        
        // Check for existing SVG
        const imagePath = `${folder}/${existingButton.name}.svg`;
        setPreviewImageSrc(convertFileSrc(imagePath));
      }
    } catch (error) {
      console.error('Failed to load existing button:', error);
      // If loading fails, treat as new button
      setIsExpanded(false);
    }
  };

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
        
        console.log('Found existing XML for button:', sanitizedName);
        
        // Parse existing XML
        def = parseButtonXML(xml);
        def.name = sanitizedName;
        def.defaultImage = `${sanitizedName}.svg`;
        xmlContent = xml;
      } catch (error) {
        // No existing XML, create default
        console.log('No existing XML, creating default for:', sanitizedName);
        def = createDefaultButton(sanitizedName);
        xmlContent = generateButtonXML(def);
      }
      
      setButtonDef(def);
      setXmlPreview(xmlContent);
      setWarnings(validateButton(def));
      
      // Check if SVG already exists and set preview
      const imagePath = `${folder}/${sanitizedName}.svg`;
      const previewSrc = convertFileSrc(imagePath);
      setPreviewImageSrc(previewSrc);
      console.log('Preview image path:', imagePath, '→', previewSrc);
      
      // Expand the dialog
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to create button:', error);
      alert(`Error: ${error}`);
    }
  };

  const handleBrowseImage = async () => {
    if (!buttonFolder || !buttonDef || !sanitizedName) return;
    
    try {
      const selected = await open({
        filters: [{ name: 'SVG Images', extensions: ['svg'] }],
        multiple: false,
        title: 'Select Button Image',
      });
      
      if (selected) {
        const sourcePath = selected as string;
        // Use button name for default image (CNC VCP requirement)
        const filename = `${sanitizedName}.svg`;
        
        console.log('Copying file:', sourcePath, '→', `${buttonFolder}/${filename}`);
        
        // Copy file to button folder
        const destPath = await invoke<string>('copy_file_to_button_folder', {
          sourcePath,
          buttonFolder,
          newFilename: filename,
        });
        
        console.log('File copied successfully to:', destPath);
        
        // Update button definition
        const updated = { ...buttonDef, defaultImage: filename };
        setButtonDef(updated);
        setXmlPreview(generateButtonXML(updated));
        setWarnings(validateButton(updated));
        
        // Update preview with cache-busting timestamp to force reload
        const imagePath = `${buttonFolder}/${filename}`;
        const cacheBuster = `?t=${Date.now()}`;
        setPreviewImageSrc(convertFileSrc(imagePath) + cacheBuster);
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
    setPreviewImageSrc(convertFileSrc(imagePath));
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
              {!isExpanded && (
                <button 
                  className="button-editor-ok-btn"
                  onClick={handleCreateButton}
                  disabled={!sanitizedName}
                >
                  OK
                </button>
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
        
        {/* Header for existing buttons */}
        {existingButton && (
          <div className="button-editor-header">
            <div className="button-name-input-row">
              <label>Button:</label>
              <span style={{ flex: 1, fontWeight: 500 }}>{existingButton.name}</span>
              <button className="button-editor-close" onClick={onClose}>×</button>
            </div>
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
                            plcOutput: { number: 1, ledColorOn: '#EC1C24', ledColorOff: '#81151C' },
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
                {buttonDef.plcOutput && (
                  <>
                    <div className="editor-section">
                      <label>Output Number:</label>
                      <input 
                        type="number" 
                        value={buttonDef.plcOutput.number}
                        onChange={(e) => {
                          const updated = { 
                            ...buttonDef, 
                            plcOutput: { ...buttonDef.plcOutput!, number: Number(e.target.value) }
                          };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }}
                        min="1"
                      />
                    </div>
                    <div className="editor-section">
                      <label>Image ON (optional):</label>
                      <div className="image-input-row">
                        <input 
                          type="text" 
                          value={buttonDef.plcOutput.imageOn || ''}
                          onChange={(e) => {
                            const updated = { 
                              ...buttonDef, 
                              plcOutput: { ...buttonDef.plcOutput!, imageOn: e.target.value || undefined }
                            };
                            setButtonDef(updated);
                            setXmlPreview(generateButtonXML(updated));
                            setWarnings(validateButton(updated));
                          }}
                          placeholder="image_on.svg"
                        />
                        <button onClick={async () => {
                          try {
                            const selected = await open({
                              filters: [{ name: 'SVG Images', extensions: ['svg'] }],
                              multiple: false,
                              title: 'Select Output ON Image',
                            });
                            if (selected) {
                              const sourcePath = selected as string;
                              const filename = sourcePath.split('/').pop() || '';
                              await invoke('copy_file_to_button_folder', {
                                sourcePath,
                                buttonFolder,
                                newFilename: filename,
                              });
                              const updated = { 
                                ...buttonDef, 
                                plcOutput: { ...buttonDef.plcOutput!, imageOn: filename }
                              };
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
                    <div className="editor-section">
                      <label>Image OFF (optional):</label>
                      <div className="image-input-row">
                        <input 
                          type="text" 
                          value={buttonDef.plcOutput.imageOff || ''}
                          onChange={(e) => {
                            const updated = { 
                              ...buttonDef, 
                              plcOutput: { ...buttonDef.plcOutput!, imageOff: e.target.value || undefined }
                            };
                            setButtonDef(updated);
                            setXmlPreview(generateButtonXML(updated));
                            setWarnings(validateButton(updated));
                          }}
                          placeholder="image_off.svg"
                        />
                        <button onClick={async () => {
                          try {
                            const selected = await open({
                              filters: [{ name: 'SVG Images', extensions: ['svg'] }],
                              multiple: false,
                              title: 'Select Output OFF Image',
                            });
                            if (selected) {
                              const sourcePath = selected as string;
                              const filename = sourcePath.split('/').pop() || '';
                              await invoke('copy_file_to_button_folder', {
                                sourcePath,
                                buttonFolder,
                                newFilename: filename,
                              });
                              const updated = { 
                                ...buttonDef, 
                                plcOutput: { ...buttonDef.plcOutput!, imageOff: filename }
                              };
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
                  </>
                )}

                <div className="editor-section" style={{ marginTop: '16px' }}>
                  <label>
                    <input 
                      type="radio" 
                      name="plc-behavior"
                      checked={!!buttonDef.plcInput}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const updated = { 
                            ...buttonDef, 
                            plcInput: { number: 1057 },
                            plcOutput: undefined
                          };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }
                      }}
                    />
                    {' '}PLC Input
                  </label>
                </div>
                {buttonDef.plcInput && (
                  <>
                    <div className="editor-section">
                      <label>Input Number:</label>
                      <select 
                        value={buttonDef.plcInput.number}
                        onChange={(e) => {
                          const updated = { 
                            ...buttonDef, 
                            plcInput: { ...buttonDef.plcInput!, number: Number(e.target.value) }
                          };
                          setButtonDef(updated);
                          setXmlPreview(generateButtonXML(updated));
                          setWarnings(validateButton(updated));
                        }}
                      >
                        {[...PLC_INPUTS].sort((a, b) => a.displayName.localeCompare(b.displayName)).map(input => (
                          <option key={input.number} value={input.number}>
                            {input.displayName} ({input.number})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="editor-section">
                      <label>Image Active (optional):</label>
                      <div className="image-input-row">
                        <input 
                          type="text" 
                          value={buttonDef.plcInput.imageActive || ''}
                          onChange={(e) => {
                            const updated = { 
                              ...buttonDef, 
                              plcInput: { ...buttonDef.plcInput!, imageActive: e.target.value || undefined }
                            };
                            setButtonDef(updated);
                            setXmlPreview(generateButtonXML(updated));
                            setWarnings(validateButton(updated));
                          }}
                          placeholder="image_active.svg"
                        />
                        <button onClick={async () => {
                          try {
                            const selected = await open({
                              filters: [{ name: 'SVG Images', extensions: ['svg'] }],
                              multiple: false,
                              title: 'Select Input Active Image',
                            });
                            if (selected) {
                              const sourcePath = selected as string;
                              const filename = sourcePath.split('/').pop() || '';
                              await invoke('copy_file_to_button_folder', {
                                sourcePath,
                                buttonFolder,
                                newFilename: filename,
                              });
                              const updated = { 
                                ...buttonDef, 
                                plcInput: { ...buttonDef.plcInput!, imageActive: filename }
                              };
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
                    <div className="editor-section">
                      <label>Image Inactive (optional):</label>
                      <div className="image-input-row">
                        <input 
                          type="text" 
                          value={buttonDef.plcInput.imageInactive || ''}
                          onChange={(e) => {
                            const updated = { 
                              ...buttonDef, 
                              plcInput: { ...buttonDef.plcInput!, imageInactive: e.target.value || undefined }
                            };
                            setButtonDef(updated);
                            setXmlPreview(generateButtonXML(updated));
                            setWarnings(validateButton(updated));
                          }}
                          placeholder="image_inactive.svg"
                        />
                        <button onClick={async () => {
                          try {
                            const selected = await open({
                              filters: [{ name: 'SVG Images', extensions: ['svg'] }],
                              multiple: false,
                              title: 'Select Input Inactive Image',
                            });
                            if (selected) {
                              const sourcePath = selected as string;
                              const filename = sourcePath.split('/').pop() || '';
                              await invoke('copy_file_to_button_folder', {
                                sourcePath,
                                buttonFolder,
                                newFilename: filename,
                              });
                              const updated = { 
                                ...buttonDef, 
                                plcInput: { ...buttonDef.plcInput!, imageInactive: filename }
                              };
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
                  </>
                )}
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
