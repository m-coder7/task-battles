use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WebviewWindowBuilder, WebviewUrl, WindowEvent};
use std::path::PathBuf;

#[tauri::command]
fn read_shared_data() -> Result<serde_json::Value, String> {
    let local_app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let path: PathBuf = local_app_data.join("TaskBattles").join("widgets.json");
    
    if !path.exists() {
        return Ok(serde_json::json!({ "goals": [], "events": [] }));
    }
    
    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read shared data: {}", e))?;
    
    let data: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse shared data: {}", e))?;
    
    Ok(data)
}

#[tauri::command]
fn spawn_widget_window(app: tauri::AppHandle, widget_type: String) -> Result<(), String> {
    let label = format!("widget-{}", widget_type);
    
    // Check if window already exists
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }
    
    let (title, width, height, url) = match widget_type.as_str() {
        "progress" => ("Progress", 240, 240, "/?widget=progress"),
        "tasks" => ("Today's Tasks", 280, 360, "/?widget=tasks"),
        "events" => ("Upcoming Events", 280, 300, "/?widget=events"),
        _ => return Err("Unknown widget type".to_string()),
    };
    
    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
        .title(title)
        .inner_size(width as f64, height as f64)
        .min_inner_size(180.0, 180.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(true)
        .build()
        .map_err(|e| format!("Failed to create widget window: {}", e))?;
    
    // Enable drag on the window by handling mouse events in the frontend
    // For now, we rely on the frontend to handle dragging
    
    // Close on right-click menu or other mechanism can be handled via frontend commands
    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            // Optionally log or handle cleanup
            let _ = app_handle;
        }
    });
    
    Ok(())
}

#[tauri::command]
fn close_widget_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn enable_drag(window: tauri::WebviewWindow) -> Result<(), String> {
    // Start dragging the window
    window.start_dragging().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            read_shared_data, 
            spawn_widget_window, 
            close_widget_window, 
            quit_app,
            enable_drag
        ])
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
