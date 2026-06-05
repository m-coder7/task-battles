use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WebviewWindowBuilder, WebviewUrl};
use std::path::PathBuf;
use std::time::Duration;

// ─── Read shared data and config ──────────────────────────────────────────────

#[tauri::command]
fn read_shared_data() -> Result<serde_json::Value, String> {
    let local_app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let path: PathBuf = local_app_data.join("TaskBattles").join("widgets.json");
    
    if !path.exists() {
        return Ok(serde_json::json!({ "goals": [], "events": [], "config": { "widgets": [] } }));
    }
    
    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read shared data: {}", e))?;
    
    let data: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse shared data: {}", e))?;
    
    Ok(data)
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    for (_, window) in app.webview_windows() {
        let _ = window.close();
    }
    app.exit(0);
}

// ─── Widget window spawner ────────────────────────────────────────────────────

fn spawn_or_update_widgets(app: &tauri::AppHandle) -> Result<(), String> {
    let data = read_shared_data()?;
    let config = data.get("config").cloned().unwrap_or(serde_json::json!({ "widgets": [] }));
    let widgets = config.get("widgets").and_then(|w| w.as_array()).cloned().unwrap_or_default();
    
    let mut expected_labels: Vec<String> = Vec::new();
    
    for w in &widgets {
        let id = w.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let enabled = w.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
        let widget_type = w.get("type").and_then(|v| v.as_str()).unwrap_or("tasks").to_string();
        let translucent = w.get("translucent").and_then(|v| v.as_bool()).unwrap_or(true);
        let theme = w.get("theme").and_then(|v| v.as_str()).unwrap_or("midnight").to_string();
        let x = w.get("x").and_then(|v| v.as_f64()).unwrap_or(100.0);
        let y = w.get("y").and_then(|v| v.as_f64()).unwrap_or(100.0);
        let width = w.get("width").and_then(|v| v.as_f64()).unwrap_or(280.0);
        let height = w.get("height").and_then(|v| v.as_f64()).unwrap_or(320.0);
        
        if !enabled || id.is_empty() {
            continue;
        }
        
        let label = format!("widget-{}", id);
        expected_labels.push(label.clone());
        
        // Check if already open
        if app.get_webview_window(&label).is_some() {
            if let Some(window) = app.get_webview_window(&label) {
                let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
            }
            continue;
        }
        
        let (default_w, default_h) = match widget_type.as_str() {
            "progress" => (240.0, 260.0),
            "events" => (280.0, 300.0),
            _ => (280.0, 360.0),
        };
        
        let w = if width > 0.0 { width } else { default_w };
        let h = if height > 0.0 { height } else { default_h };
        let url = format!("/?widget={}&theme={}&translucent={}", widget_type, theme, translucent);
        
        let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
            .title(&id)
            .inner_size(w, h)
            .min_inner_size(180.0, 180.0)
            .position(x, y)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(true)
            .resizable(true)
            .build();
    }
    
    // Close any widget windows that are no longer in config
    for (label, window) in app.webview_windows() {
        if label.starts_with("widget-") && !expected_labels.contains(&label) {
            let _ = window.close();
        }
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_shared_data,
            quit_app
        ])
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Create a hidden keeper window so the event loop never exits
            let _keeper = WebviewWindowBuilder::new(app, "keeper", WebviewUrl::App("/".into()))
                .inner_size(400.0, 300.0)
                .decorations(false)
                .transparent(true)
                .skip_taskbar(true)
                .visible(false)
                .build()?;

            // Spawn initial widgets immediately
            let app_handle = app.app_handle().clone();
            let _ = spawn_or_update_widgets(&app_handle);
            
            // Poll for config changes every 5 seconds
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(Duration::from_secs(5));
                    let _ = spawn_or_update_widgets(&app_handle);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
