// VCP Button Definition for Button Editor

export interface VcpButtonDefinition {
  name: string; // Button name (folder name)
  
  // Appearance
  defaultImage: string; // Filename only (e.g., "reset.svg")
  onClickSwap?: string; // Optional press-state swap image
  
  // Output-driven behavior (LED indicator)
  plcOutput?: {
    number: number;
    colorOn: string;    // LED color when ON (e.g., "#EC1C24")
    colorOff: string;   // LED color when OFF (e.g., "#81151C")
    imageOn?: string;   // Optional image overlay when ON
    imageOff?: string;  // Optional image overlay when OFF
  };
  
  // Input-driven behavior
  plcInput?: {
    number: number;
    imageActive?: string;
    imageInactive?: string;
  };
  
  // Behavior & Execution
  // Note: Either 'run' or 'app' can be present, but not both
  skinEventNum?: number;
  run?: {
    type: 'line' | 'macro';
    value: string;
  };
  app?: string;        // Application to launch
}

// Generate VCP button XML from definition
export function generateButtonXML(button: VcpButtonDefinition): string {
  let xml = '<vcp_button>\n';
  
  if (button.skinEventNum !== undefined) {
    xml += `  <skin_event_num>${button.skinEventNum}</skin_event_num>\n`;
  }
  
  if (button.onClickSwap) {
    xml += `  <on_click_swap>${button.onClickSwap}</on_click_swap>\n`;
  }
  
  if (button.run) {
    xml += `  <run>\n`;
    xml += `    <${button.run.type}>${escapeXml(button.run.value)}</${button.run.type}>\n`;
    xml += `  </run>\n`;
  }
  
  if (button.app) {
    xml += `  <app>${escapeXml(button.app)}</app>\n`;
  }
  
  if (button.plcOutput) {
    xml += '  <plc_output>\n';
    xml += `    <number>${button.plcOutput.number}</number>\n`;
    xml += `    <color_on>${button.plcOutput.colorOn}</color_on>\n`;
    xml += `    <color_off>${button.plcOutput.colorOff}</color_off>\n`;
    if (button.plcOutput.imageOn) {
      xml += `    <image_on>${button.plcOutput.imageOn}</image_on>\n`;
    }
    if (button.plcOutput.imageOff) {
      xml += `    <image_off>${button.plcOutput.imageOff}</image_off>\n`;
    }
    xml += '  </plc_output>\n';
  }
  
  if (button.plcInput) {
    xml += '  <plc_input>\n';
    xml += `    <number>${button.plcInput.number}</number>\n`;
    if (button.plcInput.imageActive) {
      xml += `    <image_active>${button.plcInput.imageActive}</image_active>\n`;
    }
    if (button.plcInput.imageInactive) {
      xml += `    <image_inactive>${button.plcInput.imageInactive}</image_inactive>\n`;
    }
    xml += '  </plc_input>\n';
  }
  
  xml += '</vcp_button>';
  return xml;
}

// Helper: escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Parse VCP button XML to definition
export function parseButtonXML(xml: string): VcpButtonDefinition {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  
  const button: Partial<VcpButtonDefinition> = {
    name: '',
    defaultImage: '',
  };
  
  const skinEventNum = doc.querySelector('skin_event_num')?.textContent;
  if (skinEventNum) {
    button.skinEventNum = parseInt(skinEventNum);
  }
  
  const onClickSwap = doc.querySelector('on_click_swap')?.textContent;
  if (onClickSwap) {
    button.onClickSwap = onClickSwap;
  }
  
  const runEl = doc.querySelector('run');
  if (runEl) {
    const lineEl = runEl.querySelector('line');
    const macroEl = runEl.querySelector('macro');
    
    if (lineEl && lineEl.textContent) {
      button.run = {
        type: 'line',
        value: lineEl.textContent
      };
    } else if (macroEl && macroEl.textContent) {
      button.run = {
        type: 'macro',
        value: macroEl.textContent
      };
    }
  }
  
  const app = doc.querySelector('app')?.textContent;
  if (app) {
    button.app = app;
  }
  
  const plcOutputEl = doc.querySelector('plc_output');
  if (plcOutputEl) {
    const number = plcOutputEl.querySelector('number')?.textContent;
    const colorOn = plcOutputEl.querySelector('color_on')?.textContent || '#EC1C24';
    const colorOff = plcOutputEl.querySelector('color_off')?.textContent || '#81151C';
    const imageOn = plcOutputEl.querySelector('image_on')?.textContent;
    const imageOff = plcOutputEl.querySelector('image_off')?.textContent;
    
    if (number) {
      button.plcOutput = {
        number: parseInt(number),
        colorOn: colorOn,
        colorOff: colorOff,
        imageOn: imageOn || undefined,
        imageOff: imageOff || undefined,
      };
    }
  }
  
  const plcInputEl = doc.querySelector('plc_input');
  if (plcInputEl) {
    const number = plcInputEl.querySelector('number')?.textContent;
    const imageActive = plcInputEl.querySelector('image_active')?.textContent;
    const imageInactive = plcInputEl.querySelector('image_inactive')?.textContent;
    
    if (number) {
      button.plcInput = {
        number: parseInt(number),
        imageActive: imageActive || undefined,
        imageInactive: imageInactive || undefined,
      };
    }
  }
  
  return button as VcpButtonDefinition;
}

// Determine PLC behavior type from button definition
export function getPlcBehaviorType(button: VcpButtonDefinition): 'none' | 'plc_output' | 'plc_input' {
  if (button.plcOutput) return 'plc_output';
  if (button.plcInput) return 'plc_input';
  return 'none';
}

// Create default button definition
export function createDefaultButton(name: string): VcpButtonDefinition {
  return {
    name,
    defaultImage: `${name}.svg`,
    skinEventNum: 0,
  };
}

// Validate button definition
export function validateButton(button: VcpButtonDefinition): string[] {
  const warnings: string[] = [];
  
  if (!button.defaultImage) {
    warnings.push('Missing default button image');
  }
  
  if (button.plcOutput && button.plcInput) {
    warnings.push('Cannot bind both input and output');
  }
  
  if ((button.plcOutput?.colorOn || button.plcOutput?.colorOff) && !button.plcOutput?.number) {
    warnings.push('LED colors defined but no PLC output selected');
  }
  
  if (button.plcOutput?.number && (!button.plcOutput.colorOn || !button.plcOutput.colorOff)) {
    warnings.push('PLC output requires LED colors');
  }
  
  return warnings;
}
