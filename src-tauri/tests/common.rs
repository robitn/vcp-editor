// Test utilities for VCP Editor integration tests
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

/// Creates a mock VCP folder structure for testing
pub fn setup_test_vcp_folder() -> TempDir {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let base_path = temp_dir.path();
    
    // Create folder structure
    fs::create_dir_all(base_path.join("skins")).expect("Failed to create skins folder");
    fs::create_dir_all(base_path.join("images")).expect("Failed to create images folder");
    fs::create_dir_all(base_path.join("Buttons")).expect("Failed to create Buttons folder");
    
    temp_dir
}

/// Creates a mock button structure for testing
pub fn create_mock_button(base_path: &Path, button_name: &str) -> PathBuf {
    let button_dir = base_path.join("Buttons").join(button_name);
    fs::create_dir_all(&button_dir).expect("Failed to create button directory");
    
    let xml_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<vcp_button>
    <name>{}</name>
    <type>standard</type>
    <border_index>0</border_index>
</vcp_button>"#,
        button_name
    );
    
    let xml_file = button_dir.join(format!("{}.xml", button_name));
    fs::write(&xml_file, xml_content).expect("Failed to write button XML");
    
    button_dir
}

/// Creates a mock SVG image for testing
pub fn create_mock_image(folder: &Path, image_name: &str) -> PathBuf {
    let image_file = folder.join(image_name);
    let svg_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <rect width="100" height="100" fill="blue"/>
</svg>"#;
    
    fs::write(&image_file, svg_content).expect("Failed to write SVG");
    image_file
}

/// Creates a mock VCP skin file for testing
pub fn create_mock_vcp_file(folder: &Path, skin_name: &str) -> PathBuf {
    let vcp_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<vcp_profile name="{}">
    <profile_info>
        <monitor>
            <capabilities>
                <width>1920</width>
                <height>1080</height>
            </capabilities>
        </monitor>
    </profile_info>
    <borders/>
    <buttons/>
</vcp_profile>"#,
        skin_name
    );
    
    let vcp_file = folder.join(format!("{}.vcp", skin_name));
    fs::write(&vcp_file, vcp_content).expect("Failed to write VCP file");
    vcp_file
}

/// Verifies that a file has expected content
pub fn assert_file_contains(path: &Path, expected_content: &str) {
    let actual = fs::read_to_string(path).expect("Failed to read file");
    assert!(
        actual.contains(expected_content),
        "File {} does not contain expected content.\nExpected: {}\nActual: {}",
        path.display(),
        expected_content,
        actual
    );
}

/// Verifies that a file exists
pub fn assert_file_exists(path: &Path) {
    assert!(
        path.exists(),
        "Expected file to exist at: {}",
        path.display()
    );
}

/// Verifies that a directory exists
pub fn assert_dir_exists(path: &Path) {
    assert!(
        path.is_dir(),
        "Expected directory to exist at: {}",
        path.display()
    );
}
