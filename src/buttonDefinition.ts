// VCP Button Definition for Button Editor

export interface VcpButtonDefinition {
  name: string; // Button name (folder name)
  
  // Appearance
  defaultImage: string; // Filename only (e.g., "reset.svg")
  onClickSwap?: string; // Optional press-state swap image
  
  // Output-driven behavior
  plcOutput?: {
    number: number;
    ledColorOn: string;
    ledColorOff: string;
    imageOn?: string;
    imageOff?: string;
  };
  
  // Input-driven behavior
  plcInput?: {
    number: number;
    imageActive?: string;
    imageInactive?: string;
  };
  
  // Behavior
  skinEventNum?: number;
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
  
  if (button.plcOutput) {
    xml += '  <plc_output>\n';
    xml += `    <number>${button.plcOutput.number}</number>\n`;
    xml += `    <color_on>${button.plcOutput.ledColorOn}</color_on>\n`;
    xml += `    <color_off>${button.plcOutput.ledColorOff}</color_off>\n`;
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
  
  const plcOutputEl = doc.querySelector('plc_output');
  if (plcOutputEl) {
    const number = plcOutputEl.querySelector('number')?.textContent;
    const ledColorOn = plcOutputEl.querySelector('led_color_on')?.textContent || 
                       plcOutputEl.querySelector('color_on')?.textContent;
    const ledColorOff = plcOutputEl.querySelector('led_color_off')?.textContent || 
                        plcOutputEl.querySelector('color_off')?.textContent;
    const imageOn = plcOutputEl.querySelector('image_on')?.textContent;
    const imageOff = plcOutputEl.querySelector('image_off')?.textContent;
    
    // LED colors are optional - use defaults if not present
    if (number) {
      button.plcOutput = {
        number: parseInt(number),
        ledColorOn: ledColorOn || '#EC1C24',
        ledColorOff: ledColorOff || '#81151C',
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
  
  if ((button.plcOutput?.ledColorOn || button.plcOutput?.ledColorOff) && !button.plcOutput?.number) {
    warnings.push('LED colors defined but no PLC output selected');
  }
  
  if (button.plcOutput?.number && (!button.plcOutput.ledColorOn || !button.plcOutput.ledColorOff)) {
    warnings.push('PLC output requires LED colors');
  }
  
  return warnings;
}
