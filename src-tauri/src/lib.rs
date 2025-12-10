mod backend;

use backend::models::VcpDocument;
use backend::parser::{load_file, save_file};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, State};

// Application state to manage documents
struct AppState {
    current_document: Mutex<Option<VcpDocument>>,
    current_file_path: Mutex<Option<String>>,
}

#[tauri::command]
fn new_document() -> Result<VcpDocument, String> {
    Ok(VcpDocument::default())
}

#[tauri::command]
fn open_file(path: String, state: State<AppState>) -> Result<VcpDocument, String> {
    let doc = load_file(&path)?;
    *state.current_document.lock().unwrap() = Some(doc.clone());
    *state.current_file_path.lock().unwrap() = Some(path);
    Ok(doc)
}

#[tauri::command]
fn save_file_command(path: String, doc: VcpDocument, state: State<AppState>) -> Result<(), String> {
    save_file(&path, &doc)?;
    *state.current_document.lock().unwrap() = Some(doc);
    *state.current_file_path.lock().unwrap() = Some(path);
    Ok(())
}

#[tauri::command]
fn update_document(doc: VcpDocument, state: State<AppState>) -> Result<(), String> {
    *state.current_document.lock().unwrap() = Some(doc);
    Ok(())
}

#[tauri::command]
fn get_current_document(state: State<AppState>) -> Result<Option<VcpDocument>, String> {
    Ok(state.current_document.lock().unwrap().clone())
}

#[tauri::command]
async fn print_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.print().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_button_folder(
    vcp_resources_folder: String,
    button_name: String,
) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let button_folder = format!("{}/Buttons/{}", vcp_resources_folder, button_name);
    let path = Path::new(&button_folder);

    // Create folder if it doesn't exist, or just return existing path
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| format!("Failed to create button folder: {}", e))?;
    }

    Ok(button_folder)
}

#[tauri::command]
fn ensure_vcp_folder_structure(base_path: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    let folders = vec!["skins", "images", "Buttons"];

    for folder in folders {
        let folder_path = format!("{}/{}", base_path, folder);
        let path = Path::new(&folder_path);

        if !path.exists() {
            fs::create_dir_all(path)
                .map_err(|e| format!("Failed to create {} folder: {}", folder, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
fn export_to_cnc(
    default_save_location: String,
    _vcp_resources_folder: String,
    output_path: String,
) -> Result<(), String> {
    use std::fs;
    use std::io::{Read, Write};
    use std::path::Path;
    use zip::write::FileOptions;
    use zip::ZipWriter;

    let base_path = Path::new(&default_save_location);

    // Get the folder name to use as zip root
    let folder_name = base_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("vcp-export");

    // Create zip file
    let file =
        fs::File::create(&output_path).map_err(|e| format!("Failed to create zip file: {}", e))?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::<()>::default().compression_method(zip::CompressionMethod::Deflated);

    // Walk the entire defaultSaveLocation folder recursively
    let walker = walkdir::WalkDir::new(base_path)
        .into_iter()
        .filter_map(|e| e.ok());

    for entry in walker {
        let path = entry.path();

        // Skip the root directory itself
        if path == base_path {
            continue;
        }

        if path.is_file() {
            // Get relative path from base_path
            let name = path
                .strip_prefix(base_path)
                .map_err(|e| format!("Path strip error: {}", e))?;

            // Build zip path with folder name prefix
            let zip_path = format!("{}/{}", folder_name, name.to_string_lossy());

            // Add file to zip
            zip.start_file(&zip_path, options)
                .map_err(|e| format!("Failed to add file to zip: {}", e))?;

            let mut file_data =
                fs::File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
            let mut buffer = Vec::new();
            file_data
                .read_to_end(&mut buffer)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            zip.write_all(&buffer)
                .map_err(|e| format!("Failed to write to zip: {}", e))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;
    Ok(())
}

#[tauri::command]
fn save_button_xml(
    button_folder: String,
    button_name: String,
    xml_content: String,
) -> Result<(), String> {
    use std::fs;

    let xml_path = format!("{}/{}.xml", button_folder, button_name);
    fs::write(&xml_path, xml_content).map_err(|e| format!("Failed to write button XML: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_button_xml(vcp_resources_folder: String, button_name: String) -> Result<String, String> {
    use std::fs;

    let xml_path = format!(
        "{}/Buttons/{}/{}.xml",
        vcp_resources_folder, button_name, button_name
    );
    fs::read_to_string(&xml_path).map_err(|e| format!("Failed to read button XML: {}", e))
}

#[tauri::command]
fn copy_file_to_button_folder(
    source_path: String,
    button_folder: String,
    new_filename: String,
) -> Result<String, String> {
    use std::fs;
    use std::io::Write;

    let dest_path = format!("{}/{}", button_folder, new_filename);

    // Read source file completely into memory
    let data = fs::read(&source_path)
        .map_err(|e| format!("Failed to read source file '{}': {}", source_path, e))?;

    // Verify we actually read data
    if data.is_empty() {
        return Err(format!(
            "Source file '{}' is empty or is a cloud placeholder",
            source_path
        ));
    }

    // Write to destination
    let mut file = fs::File::create(&dest_path)
        .map_err(|e| format!("Failed to create destination file '{}': {}", dest_path, e))?;

    file.write_all(&data)
        .map_err(|e| format!("Failed to write to destination file '{}': {}", dest_path, e))?;

    Ok(dest_path)
}

#[tauri::command]
fn list_existing_buttons(vcp_resources_folder: String) -> Result<Vec<String>, String> {
    use std::fs;

    let buttons_dir = format!("{}/Buttons", vcp_resources_folder);
    let entries = fs::read_dir(&buttons_dir)
        .map_err(|e| format!("Failed to read Buttons directory: {}", e))?;

    let mut buttons = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    if let Some(name) = entry.file_name().to_str() {
                        buttons.push(name.to_string());
                    }
                }
            }
        }
    }

    buttons.sort();
    Ok(buttons)
}

#[tauri::command]
fn check_svg_file(file_path: String) -> Result<String, String> {
    use std::fs;

    // Check if file exists
    if !std::path::Path::new(&file_path).exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Try to read the file
    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Check if it looks like SVG
    if !content.trim().starts_with("<?xml") && !content.trim().starts_with("<svg") {
        return Err("File does not appear to be an SVG".to_string());
    }

    Ok(format!("SVG file is readable, {} bytes", content.len()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Create menu items
            let new_item = MenuItem::with_id(app, "new", "New", true, Some("CmdOrCtrl+N"))?;
            let open_item = MenuItem::with_id(app, "open", "Open...", true, Some("CmdOrCtrl+O"))?;
            let save_item = MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let save_as_item = MenuItem::with_id(
                app,
                "save_as",
                "Save As...",
                true,
                Some("CmdOrCtrl+Shift+S"),
            )?;
            let export_item =
                MenuItem::with_id(app, "export_cnc", "Export to CNC...", true, None::<&str>)?;
            let print_item =
                MenuItem::with_id(app, "print", "Print...", true, Some("CmdOrCtrl+P"))?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Quit VCP Editor", true, Some("CmdOrCtrl+Q"))?;
            let about_item =
                MenuItem::with_id(app, "about", "About VCP Editor", true, None::<&str>)?;

            // View menu items
            let refresh_images_item =
                MenuItem::with_id(app, "refresh_images", "Refresh Images", true, None::<&str>)?;
            let zoom_in_item =
                MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+Equal"))?;
            let zoom_out_item =
                MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+Minus"))?;
            let toggle_grid_item = MenuItem::with_id(
                app,
                "toggle_grid",
                "Toggle Grid Lines",
                true,
                Some("CmdOrCtrl+G"),
            )?;

            // Build menus
            #[cfg(target_os = "macos")]
            {
                // On macOS, use predefined menu items in release builds so the OS
                // provides system icons and localized labels. In debug (dev)
                // builds the running process may not be bundled, so provide
                // explicit labels for hide/hide others/show all to match the
                // packaged app display name.
                #[cfg(debug_assertions)]
                let hide_item =
                    MenuItem::with_id(app, "hide", "Hide VCP Editor", true, None::<&str>)?;
                #[cfg(not(debug_assertions))]
                let hide_item = PredefinedMenuItem::hide(app, None)?;

                #[cfg(debug_assertions)]
                let hide_others_item =
                    MenuItem::with_id(app, "hide_others", "Hide Others", true, None::<&str>)?;
                #[cfg(not(debug_assertions))]
                let hide_others_item = PredefinedMenuItem::hide_others(app, None)?;

                #[cfg(debug_assertions)]
                let show_all_item =
                    MenuItem::with_id(app, "show_all", "Show All", true, None::<&str>)?;
                #[cfg(not(debug_assertions))]
                let show_all_item = PredefinedMenuItem::show_all(app, None)?;

                let app_menu = Submenu::with_items(
                    app,
                    "VCP Editor",
                    true,
                    &[
                        &about_item,
                        &PredefinedMenuItem::separator(app)?,
                        &settings_item,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::services(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &hide_item,
                        &hide_others_item,
                        &show_all_item,
                        &PredefinedMenuItem::separator(app)?,
                        &quit_item,
                    ],
                )?;

                let file_menu = Submenu::with_items(
                    app,
                    "File",
                    true,
                    &[
                        &new_item,
                        &open_item,
                        &PredefinedMenuItem::separator(app)?,
                        &save_item,
                        &save_as_item,
                        &PredefinedMenuItem::separator(app)?,
                        &export_item,
                        &PredefinedMenuItem::separator(app)?,
                        &print_item,
                    ],
                )?;

                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[
                        &PredefinedMenuItem::undo(app, None)?,
                        &PredefinedMenuItem::redo(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::cut(app, None)?,
                        &PredefinedMenuItem::copy(app, None)?,
                        &PredefinedMenuItem::paste(app, None)?,
                        &PredefinedMenuItem::select_all(app, None)?,
                    ],
                )?;

                let window_menu = Submenu::with_items(
                    app,
                    "Window",
                    true,
                    &[
                        &PredefinedMenuItem::minimize(app, None)?,
                        &PredefinedMenuItem::maximize(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::close_window(app, None)?,
                    ],
                )?;

                let view_menu = Submenu::with_items(
                    app,
                    "View",
                    true,
                    &[
                        &refresh_images_item,
                        &PredefinedMenuItem::separator(app)?,
                        &zoom_in_item,
                        &zoom_out_item,
                        &PredefinedMenuItem::separator(app)?,
                        &toggle_grid_item,
                    ],
                )?;

                let menu = Menu::with_items(
                    app,
                    &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu],
                )?;
                app.set_menu(menu)?;
            }

            #[cfg(not(target_os = "macos"))]
            {
                let file_menu = Submenu::with_items(
                    app,
                    "File",
                    true,
                    &[
                        &new_item,
                        &open_item,
                        &PredefinedMenuItem::separator(app)?,
                        &save_item,
                        &save_as_item,
                        &PredefinedMenuItem::separator(app)?,
                        &export_item,
                        &PredefinedMenuItem::separator(app)?,
                        &print_item,
                        &PredefinedMenuItem::separator(app)?,
                        &quit_item,
                    ],
                )?;

                let edit_menu = Submenu::with_items(
                    app,
                    "Edit",
                    true,
                    &[
                        &PredefinedMenuItem::undo(app, None)?,
                        &PredefinedMenuItem::redo(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::cut(app, None)?,
                        &PredefinedMenuItem::copy(app, None)?,
                        &PredefinedMenuItem::paste(app, None)?,
                    ],
                )?;

                let window_menu = Submenu::with_items(
                    app,
                    "Window",
                    true,
                    &[
                        &PredefinedMenuItem::minimize(app, None)?,
                        &PredefinedMenuItem::maximize(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::close_window(app, None)?,
                    ],
                )?;

                let view_menu = Submenu::with_items(
                    app,
                    "View",
                    true,
                    &[
                        &refresh_images_item,
                        &PredefinedMenuItem::separator(app)?,
                        &zoom_in_item,
                        &zoom_out_item,
                        &PredefinedMenuItem::separator(app)?,
                        &toggle_grid_item,
                    ],
                )?;

                let menu =
                    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &window_menu])?;
                app.set_menu(menu)?;
            }

            // Handle menu events
            app.on_menu_event(|app, event| match event.id().as_ref() {
                "new" => {
                    let _ = app.emit("menu-new", ());
                }
                "open" => {
                    let _ = app.emit("menu-open", ());
                }
                "save" => {
                    let _ = app.emit("menu-save", ());
                }
                "save_as" => {
                    let _ = app.emit("menu-save-as", ());
                }
                "export_cnc" => {
                    let _ = app.emit("menu-export-cnc", ());
                }
                "print" => {
                    let _ = app.emit("menu-print", ());
                }
                "settings" => {
                    let _ = app.emit("menu-settings", ());
                }
                "refresh_images" => {
                    let _ = app.emit("menu-refresh-images", ());
                }
                "zoom_in" => {
                    let _ = app.emit("menu-zoom-in", ());
                }
                "zoom_out" => {
                    let _ = app.emit("menu-zoom-out", ());
                }
                "toggle_grid" => {
                    let _ = app.emit("menu-toggle-grid", ());
                }
                "quit" => {
                    let _ = app.emit("menu-quit", ());
                }
                "about" => {
                    let _ = app.emit("menu-about", ());
                }
                _ => {}
            });

            // Open DevTools in development mode
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .manage(AppState {
            current_document: Mutex::new(None),
            current_file_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            new_document,
            open_file,
            save_file_command,
            update_document,
            get_current_document,
            print_window,
            create_button_folder,
            ensure_vcp_folder_structure,
            export_to_cnc,
            save_button_xml,
            load_button_xml,
            copy_file_to_button_folder,
            list_existing_buttons,
            check_svg_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
