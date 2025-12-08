use crate::models::*;
use std::fs;

pub fn parse_vcp(content: &str) -> Result<VcpDocument, String> {
    let mut doc = VcpDocument::default();
    
    // Simple XML parsing without external dependencies
    let lines: Vec<&str> = content.lines().collect();
    let mut i = 0;
    
    while i < lines.len() {
        let line = lines[i].trim();
        
        if line.starts_with("<background>") {
            doc.background = extract_text_content(line);
        } else if line.starts_with("<column_count>") {
            doc.column_count = extract_text_content(line).parse().unwrap_or(6);
        } else if line.starts_with("<row_count>") {
            doc.row_count = extract_text_content(line).parse().unwrap_or(14);
        } else if line.starts_with("<border>") {
            let border = parse_border(&lines, &mut i)?;
            doc.borders.push(border);
        } else if line.starts_with("<image>") {
            let image = parse_image(&lines, &mut i)?;
            doc.images.push(image);
        } else if line.starts_with("<button ") {
            let button = parse_button(line)?;
            doc.buttons.push(button);
        } else if line.starts_with("<on_click>") {
            doc.on_click = Some(parse_on_click(&lines, &mut i)?);
        } else if line.starts_with("<on_hover>") {
            doc.on_hover = Some(parse_on_hover(&lines, &mut i)?);
        }
        
        i += 1;
    }
    
    Ok(doc)
}

fn extract_text_content(line: &str) -> String {
    let start = line.find('>').unwrap_or(0) + 1;
    let end = line.rfind('<').unwrap_or(line.len());
    line[start..end].to_string()
}

fn parse_border(lines: &[&str], index: &mut usize) -> Result<Border, String> {
    let mut border = Border {
        row_start: 1,
        column_start: 1,
        row_span: 1,
        column_span: 1,
        fill: "Transparent".to_string(),
        outline_color: "#000000".to_string(),
        outline_thickness: 1,
        plc_word: None,
    };
    
    *index += 1;
    while *index < lines.len() {
        let line = lines[*index].trim();
        
        if line.starts_with("</border>") {
            break;
        } else if line.starts_with("<row_start>") {
            border.row_start = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<column_start>") {
            border.column_start = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<row_span>") {
            border.row_span = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<column_span>") {
            border.column_span = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<fill>") {
            border.fill = extract_text_content(line);
        } else if line.starts_with("<outline_color>") {
            border.outline_color = extract_text_content(line);
        } else if line.starts_with("<outline_thickness>") {
            border.outline_thickness = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<plc_word>") {
            border.plc_word = Some(parse_plc_word(lines, index)?);
        }
        
        *index += 1;
    }
    
    Ok(border)
}

fn parse_plc_word(lines: &[&str], index: &mut usize) -> Result<PlcWord, String> {
    let mut plc = PlcWord {
        number: 0,
        color: "#000000".to_string(),
        fontsize: 12,
        font: "Arial".to_string(),
        fontstyle: "normal".to_string(),
        verticalalignment: "center".to_string(),
        horizontalalignment: "center".to_string(),
        marginbottom: 0,
        percentage: false,
    };
    
    *index += 1;
    while *index < lines.len() {
        let line = lines[*index].trim();
        
        if line.starts_with("</plc_word>") {
            break;
        } else if line.starts_with("<number>") {
            plc.number = extract_text_content(line).parse().unwrap_or(0);
        } else if line.starts_with("<color>") {
            plc.color = extract_text_content(line);
        } else if line.starts_with("<fontsize>") {
            plc.fontsize = extract_text_content(line).parse().unwrap_or(12);
        } else if line.starts_with("<font>") {
            plc.font = extract_text_content(line);
        } else if line.starts_with("<fontstyle>") {
            plc.fontstyle = extract_text_content(line);
        } else if line.starts_with("<verticalalignment>") {
            plc.verticalalignment = extract_text_content(line);
        } else if line.starts_with("<horizontalalignment>") {
            plc.horizontalalignment = extract_text_content(line);
        } else if line.starts_with("<marginbottom>") {
            plc.marginbottom = extract_text_content(line).parse().unwrap_or(0);
        } else if line.starts_with("<percentage>") {
            plc.percentage = extract_text_content(line) == "true";
        }
        
        *index += 1;
    }
    
    Ok(plc)
}

fn parse_image(lines: &[&str], index: &mut usize) -> Result<Image, String> {
    let mut image = Image {
        row_start: 1,
        column_start: 1,
        row_span: 1,
        column_span: 1,
        path: String::new(),
    };
    
    *index += 1;
    while *index < lines.len() {
        let line = lines[*index].trim();
        
        if line.starts_with("</image>") {
            break;
        } else if line.starts_with("<row_start>") {
            image.row_start = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<column_start>") {
            image.column_start = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<row_span>") {
            image.row_span = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<column_span>") {
            image.column_span = extract_text_content(line).parse().unwrap_or(1);
        } else if line.starts_with("<path>") {
            image.path = extract_text_content(line);
        }
        
        *index += 1;
    }
    
    Ok(image)
}

fn parse_button(line: &str) -> Result<Button, String> {
    let mut button = Button {
        row: 1,
        column: 1,
        row_span: None,
        column_span: None,
        name: String::new(),
        file: None,
        default_image: None,
    };
    
    // Parse attributes
    if let Some(row_pos) = line.find("row=\"") {
        let start = row_pos + 5;
        if let Some(end) = line[start..].find('"') {
            button.row = line[start..start + end].parse().unwrap_or(1);
        }
    }
    
    if let Some(col_pos) = line.find("column=\"") {
        let start = col_pos + 8;
        if let Some(end) = line[start..].find('"') {
            button.column = line[start..start + end].parse().unwrap_or(1);
        }
    }
    
    if let Some(row_span_pos) = line.find("row_span=\"") {
        let start = row_span_pos + 10;
        if let Some(end) = line[start..].find('"') {
            button.row_span = line[start..start + end].parse().ok();
        }
    }
    
    if let Some(col_span_pos) = line.find("column_span=\"") {
        let start = col_span_pos + 13;
        if let Some(end) = line[start..].find('"') {
            button.column_span = line[start..start + end].parse().ok();
        }
    }
    
    // Parse button name (text content)
    button.name = extract_text_content(line);
    
    Ok(button)
}

fn parse_on_click(lines: &[&str], index: &mut usize) -> Result<OnClick, String> {
    let mut on_click = OnClick {
        opacity: 100,
        outline_color: "#000000".to_string(),
    };
    
    *index += 1;
    while *index < lines.len() {
        let line = lines[*index].trim();
        
        if line.starts_with("</on_click>") {
            break;
        } else if line.starts_with("<opacity>") {
            on_click.opacity = extract_text_content(line).parse().unwrap_or(100);
        } else if line.starts_with("<outline_color>") {
            on_click.outline_color = extract_text_content(line);
        }
        
        *index += 1;
    }
    
    Ok(on_click)
}

fn parse_on_hover(lines: &[&str], index: &mut usize) -> Result<OnHover, String> {
    let mut on_hover = OnHover {
        opacity: 100,
        outline_color: "#ffffff".to_string(),
    };
    
    *index += 1;
    while *index < lines.len() {
        let line = lines[*index].trim();
        
        if line.starts_with("</on_hover>") {
            break;
        } else if line.starts_with("<opacity>") {
            on_hover.opacity = extract_text_content(line).parse().unwrap_or(100);
        } else if line.starts_with("<outline_color>") {
            on_hover.outline_color = extract_text_content(line);
        }
        
        *index += 1;
    }
    
    Ok(on_hover)
}

pub fn serialize_vcp(doc: &VcpDocument) -> String {
    let mut xml = String::new();
    xml.push_str("<vcp_skin>\n");
    
    // Document root elements in canonical order
    xml.push_str(&format!("    <background>{}</background>\n", doc.background));
    xml.push_str(&format!("    <column_count>{}</column_count>\n", doc.column_count));
    xml.push_str(&format!("    <row_count>{}</row_count>\n", doc.row_count));
    
    // Borders
    for border in &doc.borders {
        xml.push_str("    <border>\n");
        xml.push_str(&format!("        <column_span>{}</column_span>\n", border.column_span));
        xml.push_str(&format!("        <column_start>{}</column_start>\n", border.column_start));
        xml.push_str(&format!("        <fill>{}</fill>\n", border.fill));
        xml.push_str(&format!("        <row_span>{}</row_span>\n", border.row_span));
        xml.push_str(&format!("        <row_start>{}</row_start>\n", border.row_start));
        xml.push_str(&format!("        <outline_color>{}</outline_color>\n", border.outline_color));
        xml.push_str(&format!("        <outline_thickness>{}</outline_thickness>\n", border.outline_thickness));
        
        if let Some(plc) = &border.plc_word {
            xml.push_str("        <plc_word>\n");
            xml.push_str(&format!("            <number>{}</number>\n", plc.number));
            xml.push_str(&format!("            <color>{}</color>\n", plc.color));
            xml.push_str(&format!("            <fontsize>{}</fontsize>\n", plc.fontsize));
            xml.push_str(&format!("            <font>{}</font>\n", plc.font));
            xml.push_str(&format!("            <fontstyle>{}</fontstyle>\n", plc.fontstyle));
            xml.push_str(&format!("            <verticalalignment>{}</verticalalignment>\n", plc.verticalalignment));
            xml.push_str(&format!("            <horizontalalignment>{}</horizontalalignment>\n", plc.horizontalalignment));
            xml.push_str(&format!("            <marginbottom>{}</marginbottom>\n", plc.marginbottom));
            xml.push_str(&format!("            <percentage>{}</percentage>\n", plc.percentage));
            xml.push_str("        </plc_word>\n");
        }
        
        xml.push_str("    </border>\n");
    }
    
    // Images
    for image in &doc.images {
        xml.push_str("    <image>\n");
        xml.push_str(&format!("        <column_span>{}</column_span>\n", image.column_span));
        xml.push_str(&format!("        <column_start>{}</column_start>\n", image.column_start));
        xml.push_str(&format!("        <row_span>{}</row_span>\n", image.row_span));
        xml.push_str(&format!("        <row_start>{}</row_start>\n", image.row_start));
        xml.push_str(&format!("        <path>{}</path>\n", image.path));
        xml.push_str("    </image>\n");
    }
    
    // On click and on hover
    if let Some(on_click) = &doc.on_click {
        xml.push_str("    <on_click>\n");
        xml.push_str(&format!("        <opacity>{}</opacity>\n", on_click.opacity));
        xml.push_str(&format!("        <outline_color>{}</outline_color>\n", on_click.outline_color));
        xml.push_str("    </on_click>\n");
    }
    
    if let Some(on_hover) = &doc.on_hover {
        xml.push_str("    <on_hover>\n");
        xml.push_str(&format!("        <opacity>{}</opacity>\n", on_hover.opacity));
        xml.push_str(&format!("        <outline_color>{}</outline_color>\n", on_hover.outline_color));
        xml.push_str("    </on_hover>\n");
    }
    
    // Buttons
    for button in &doc.buttons {
        xml.push_str(&format!("    <button row=\"{}\" column=\"{}\"", button.row, button.column));
        if let Some(row_span) = button.row_span {
            xml.push_str(&format!(" row_span=\"{}\"", row_span));
        }
        if let Some(col_span) = button.column_span {
            xml.push_str(&format!(" column_span=\"{}\"", col_span));
        }
        xml.push_str(&format!(">{}</button>\n", button.name));
    }
    
    xml.push_str("</vcp_skin>\n");
    xml
}

pub fn load_file(path: &str) -> Result<VcpDocument, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let mut doc = parse_vcp(&content)?;
    
    // Get the VCP root directory
    // Skin file can be at vcp/skins/skin.vcp or vcp/skin.vcp
    let skin_path = std::path::Path::new(path);
    let mut vcp_root = skin_path.parent().ok_or("Failed to get parent directory")?;
    
    // If parent is "skins", go up one more level to get vcp root
    if vcp_root.file_name().and_then(|n| n.to_str()) == Some("skins") {
        vcp_root = vcp_root.parent().ok_or("Failed to get VCP root directory")?;
    }
    
    println!("VCP root directory: {:?}", vcp_root);
    
    // Check each button for an accompanying XML file
    for button in &mut doc.buttons {
        if !button.name.is_empty() {
            let xml_path = vcp_root.join("Buttons").join(&button.name).join(format!("{}.xml", button.name));
            println!("Checking for XML at: {:?}", xml_path);
            if xml_path.exists() {
                println!("Found XML file for button: {}", button.name);
                button.file = Some(format!("{}.xml", button.name));
                
                // Parse the XML to get defaultImage
                if let Ok(xml_content) = fs::read_to_string(&xml_path) {
                    // Simple XML parsing to extract default_image value
                    // Look for <default_image>filename.svg</default_image>
                    if let Some(start_pos) = xml_content.find("<default_image>") {
                        let content_start = start_pos + 15; // Length of "<default_image>"
                        if let Some(end_pos) = xml_content[content_start..].find("</default_image>") {
                            let default_image = xml_content[content_start..content_start + end_pos].trim();
                            if !default_image.is_empty() {
                                button.default_image = Some(default_image.to_string());
                                println!("Found default_image: {}", default_image);
                            }
                        }
                    }
                }
            } else {
                println!("No XML file found for button: {}", button.name);
            }
        }
    }
    
    Ok(doc)
}

pub fn save_file(path: &str, doc: &VcpDocument) -> Result<(), String> {
    let xml = serialize_vcp(doc);
    fs::write(path, xml)
        .map_err(|e| format!("Failed to write file: {}", e))
}
