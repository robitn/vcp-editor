#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    #[test]
    fn test_create_button_folder_creates_directory() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        let result = create_button_folder(base_path.clone(), "test_button".to_string());
        
        assert!(result.is_ok());
        let folder_path = result.unwrap();
        assert!(Path::new(&folder_path).exists());
    }

    #[test]
    fn test_create_button_folder_with_existing_folder() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        // Create folder twice
        let result1 = create_button_folder(base_path.clone(), "test_button".to_string());
        let result2 = create_button_folder(base_path.clone(), "test_button".to_string());
        
        assert!(result1.is_ok());
        assert!(result2.is_ok());
        assert_eq!(result1.unwrap(), result2.unwrap());
    }

    #[test]
    fn test_copy_file_to_button_folder_success() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let source_path = temp_dir.path().join("source.svg");
        fs::write(&source_path, "test content").expect("Failed to write source file");
        
        let dest_dir = temp_dir.path().join("dest");
        fs::create_dir(&dest_dir).expect("Failed to create dest dir");
        
        let result = copy_file_to_button_folder(
            source_path.to_str().unwrap().to_string(),
            dest_dir.to_str().unwrap().to_string(),
            "copied.svg".to_string(),
        );
        
        assert!(result.is_ok());
        let dest_file = dest_dir.join("copied.svg");
        assert!(dest_file.exists());
        
        let content = fs::read_to_string(&dest_file).expect("Failed to read copied file");
        assert_eq!(content, "test content");
    }

    #[test]
    fn test_copy_file_nonexistent_source() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let dest_dir = temp_dir.path().join("dest");
        fs::create_dir(&dest_dir).expect("Failed to create dest dir");
        
        let result = copy_file_to_button_folder(
            "/nonexistent/file.svg".to_string(),
            dest_dir.to_str().unwrap().to_string(),
            "copied.svg".to_string(),
        );
        
        assert!(result.is_err());
    }

    #[test]
    fn test_save_button_xml_creates_file() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let button_folder = temp_dir.path().to_str().unwrap().to_string();
        
        let result = save_button_xml(
            button_folder.clone(),
            "test_button".to_string(),
            "<vcp_button></vcp_button>".to_string(),
        );
        
        assert!(result.is_ok());
        
        let xml_file = format!("{}/test_button.xml", button_folder);
        assert!(Path::new(&xml_file).exists());
        
        let content = fs::read_to_string(&xml_file).expect("Failed to read XML");
        assert_eq!(content, "<vcp_button></vcp_button>");
    }

    #[test]
    fn test_load_button_xml_success() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        // Create button folder and XML file
        let button_dir = format!("{}/Buttons/test_button", base_path);
        fs::create_dir_all(&button_dir).expect("Failed to create button dir");
        
        let xml_content = "<vcp_button><name>Test</name></vcp_button>";
        let xml_file = format!("{}/test_button.xml", button_dir);
        fs::write(&xml_file, xml_content).expect("Failed to write XML");
        
        let result = load_button_xml(base_path, "test_button".to_string());
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), xml_content);
    }

    #[test]
    fn test_load_button_xml_not_found() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        let result = load_button_xml(base_path, "nonexistent_button".to_string());
        
        assert!(result.is_err());
    }

    #[test]
    fn test_ensure_vcp_folder_structure() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        let result = ensure_vcp_folder_structure(base_path.clone());
        
        assert!(result.is_ok());
        
        // Check all folders exist
        assert!(Path::new(&format!("{}/skins", base_path)).exists());
        assert!(Path::new(&format!("{}/images", base_path)).exists());
        assert!(Path::new(&format!("{}/Buttons", base_path)).exists());
    }

    #[test]
    fn test_ensure_vcp_folder_structure_idempotent() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        let result1 = ensure_vcp_folder_structure(base_path.clone());
        let result2 = ensure_vcp_folder_structure(base_path.clone());
        
        assert!(result1.is_ok());
        assert!(result2.is_ok());
    }

    #[test]
    fn test_file_operations_with_special_characters() {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let base_path = temp_dir.path().to_str().unwrap().to_string();
        
        // Create folder with special characters
        let result = create_button_folder(
            base_path.clone(),
            "test button (1) [copy]".to_string(),
        );
        
        assert!(result.is_ok());
    }
}
