// Integration tests for file operations
mod common;

use common::*;
use std::fs;


#[test]
fn test_vcp_folder_creation_workflow() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Verify structure exists
    assert_dir_exists(&base_path.join("skins"));
    assert_dir_exists(&base_path.join("images"));
    assert_dir_exists(&base_path.join("Buttons"));
}

#[test]
fn test_create_and_save_button_workflow() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create button
    let button_dir = create_mock_button(base_path, "test_btn");
    
    // Verify button directory
    assert_file_exists(&button_dir.join("test_btn.xml"));
    
    // Verify XML content
    assert_file_contains(
        &button_dir.join("test_btn.xml"),
        "<name>test_btn</name>",
    );
}

#[test]
fn test_image_copy_workflow() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create source image
    let source_image = temp_base.path().join("source_image.svg");
    let svg_content = r#"<?xml version="1.0"?><svg></svg>"#;
    fs::write(&source_image, svg_content).expect("Failed to write source image");
    
    // Create destination folder
    let dest_folder = base_path.join("images");
    
    // Copy image (simulated)
    let dest_image = dest_folder.join("copied_image.svg");
    fs::copy(&source_image, &dest_image).expect("Failed to copy image");
    
    // Verify
    assert_file_exists(&dest_image);
    let copied_content = fs::read_to_string(&dest_image).expect("Failed to read copied image");
    assert_eq!(copied_content, svg_content);
}

#[test]
fn test_multiple_buttons_in_folder() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create multiple buttons
    create_mock_button(base_path, "button_1");
    create_mock_button(base_path, "button_2");
    create_mock_button(base_path, "button_3");
    
    // Verify all exist
    assert_file_exists(&base_path.join("Buttons/button_1/button_1.xml"));
    assert_file_exists(&base_path.join("Buttons/button_2/button_2.xml"));
    assert_file_exists(&base_path.join("Buttons/button_3/button_3.xml"));
}

#[test]
fn test_vcp_file_creation_workflow() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    let skins_folder = base_path.join("skins");
    
    // Create VCP file
    create_mock_vcp_file(&skins_folder, "default_skin");
    
    // Verify file exists and has proper structure
    let vcp_file = skins_folder.join("default_skin.vcp");
    assert_file_exists(&vcp_file);
    assert_file_contains(&vcp_file, "<vcp_profile name=\"default_skin\">");
    assert_file_contains(&vcp_file, "<borders/>");
}

#[test]
fn test_button_with_images() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create button with image
    let button_dir = create_mock_button(base_path, "btn_with_image");
    create_mock_image(&button_dir, "button_icon.svg");
    
    // Verify
    assert_file_exists(&button_dir.join("button_icon.svg"));
}

#[test]
fn test_concurrent_folder_creation() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Simulate creating multiple buttons concurrently
    for i in 0..10 {
        let button_name = format!("btn_{}", i);
        create_mock_button(base_path, &button_name);
    }
    
    // Verify all created successfully
    for i in 0..10 {
        let button_name = format!("btn_{}", i);
        assert_file_exists(&base_path.join(format!("Buttons/{}/{}.xml", button_name, button_name)));
    }
}

#[test]
fn test_vcp_file_with_multiple_buttons() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create skin
    create_mock_vcp_file(&base_path.join("skins"), "complex_skin");
    
    // Create associated buttons
    for i in 0..5 {
        let button_name = format!("skin_button_{}", i);
        create_mock_button(base_path, &button_name);
    }
    
    // Verify all files exist
    assert_file_exists(&base_path.join("skins/complex_skin.vcp"));
    for i in 0..5 {
        let button_name = format!("skin_button_{}", i);
        assert_file_exists(&base_path.join(format!("Buttons/{}/{}.xml", button_name, button_name)));
    }
}

#[test]
fn test_large_image_handling() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create a larger image
    let large_svg = r#"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="2560" height="1440" fill="url(#grad)"/>
</svg>"#;
    
    let image_file = base_path.join("images/large_image.svg");
    fs::write(&image_file, large_svg).expect("Failed to write large image");
    
    assert_file_exists(&image_file);
    let size = fs::metadata(&image_file).expect("Failed to get metadata").len();
    assert!(size > 0, "Image should have content");
}

#[test]
fn test_folder_structure_integrity() {
    let temp_base = setup_test_vcp_folder();
    let base_path = temp_base.path();
    
    // Create complex structure
    create_mock_vcp_file(&base_path.join("skins"), "skin1");
    create_mock_vcp_file(&base_path.join("skins"), "skin2");
    
    create_mock_button(base_path, "btn1");
    create_mock_button(base_path, "btn2");
    
    create_mock_image(&base_path.join("images"), "img1.svg");
    create_mock_image(&base_path.join("images"), "img2.svg");
    
    // Verify all structure is intact
    let entries = fs::read_dir(base_path).expect("Failed to read directory");
    let mut dir_count = 0;
    for entry in entries {
        if let Ok(entry) = entry {
            if entry.path().is_dir() {
                dir_count += 1;
            }
        }
    }
    
    assert_eq!(dir_count, 3); // skins, images, Buttons
}
