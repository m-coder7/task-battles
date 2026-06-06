use tauri::{Manager, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_opener::OpenerExt;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

// ─── State ────────────────────────────────────────────────────────────────────

struct WidgetState {
    user_closed: Mutex<HashSet<String>>,
}

impl WidgetState {
    fn new() -> Self {
        Self {
            user_closed: Mutex::new(load_user_closed()),
        }
    }
}

fn state_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_default()
        .join("TaskBattles")
        .join("widget-state.json")
}

fn load_user_closed() -> HashSet<String> {
    if let Ok(contents) = std::fs::read_to_string(state_path()) {
        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&contents) {
            if let Some(arr) = data.get("user_closed").and_then(|v| v.as_array()) {
                return arr.iter().filter_map(|v| v.as_str().map(String::from)).collect();
            }
        }
    }
    HashSet::new()
}

fn save_user_closed(set: &HashSet<String>) {
    let data = serde_json::json!({ "user_closed": set.iter().collect::<Vec<_>>() });
    let _ = std::fs::create_dir_all(state_path().parent().unwrap());
    let _ = std::fs::write(state_path(), serde_json::to_string(&data).unwrap_or_default());
}

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn read_shared_data() -> Result<serde_json::Value, String> {
    let path = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?
        .join("TaskBattles")
        .join("widgets.json");
    
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
fn close_widget(app: tauri::AppHandle, state: tauri::State<WidgetState>, label: String) {
    let id = label.strip_prefix("widget-").unwrap_or(&label).to_string();
    state.user_closed.lock().unwrap().insert(id);
    save_user_closed(&state.user_closed.lock().unwrap());
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.close();
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    for (_, window) in app.webview_windows() {
        let _ = window.close();
    }
    app.exit(0);
}

#[tauri::command]
fn open_main_app(app: tauri::AppHandle) -> Result<(), String> {
    app.opener()
        .open_url("taskbattles://focus", None::<&str>)
        .map_err(|e| e.to_string())
}

// ─── Widget window spawner ────────────────────────────────────────────────────

fn spawn_or_update_widgets(app: &tauri::AppHandle, state: &tauri::State<WidgetState>) -> Result<(), String> {
    let data = read_shared_data()?;
    let config = data.get("config").cloned().unwrap_or(serde_json::json!({ "widgets": [] }));
    let widgets = config.get("widgets").and_then(|w| w.as_array()).cloned().unwrap_or_default();
    
    let mut expected_labels: Vec<String> = Vec::new();
    let mut user_closed = state.user_closed.lock().unwrap();
    
    for (index, w) in widgets.iter().enumerate() {
        let id = w.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let enabled = w.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
        let widget_type = w.get("type").and_then(|v| v.as_str()).unwrap_or("tasks").to_string();
        let translucent = w.get("translucent").and_then(|v| v.as_bool()).unwrap_or(true);
        let theme = w.get("theme").and_then(|v| v.as_str()).unwrap_or("midnight").to_string();
        
        if !enabled || id.is_empty() {
            continue;
        }
        
        let label = format!("widget-{}", id);
        
        // User manually closed this widget - don't respawn
        if user_closed.contains(&id) {
            continue;
        }
        
        expected_labels.push(label.clone());
        
        // Already open? Leave it alone so user drag/resize persists
        if app.get_webview_window(&label).is_some() {
            continue;
        }
        
        // Calculate initial position with cascading offset
        let x = 50.0 + (index as f64 * 30.0);
        let y = 50.0 + (index as f64 * 30.0);
        
        let (default_w, default_h) = match widget_type.as_str() {
            "progress" => (240.0, 260.0),
            "events" => (280.0, 300.0),
            _ => (280.0, 360.0),
        };
        
        let url = format!("/?widget={}&theme={}&translucent={}", widget_type, theme, translucent);
        
        let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
            .title(&id)
            .inner_size(default_w, default_h)
            .min_inner_size(180.0, 180.0)
            .position(x, y)
            .decorations(false)
            .transparent(true)
            .skip_taskbar(true)
            .visible(true)
            .resizable(true)
            .build();
    }
    
    // Close windows no longer in config, and clean up user_closed
    for (label, window) in app.webview_windows() {
        if label.starts_with("widget-") && !expected_labels.contains(&label) {
            let _ = window.close();
            let id = label.strip_prefix("widget-").unwrap_or(&label).to_string();
            user_closed.remove(&id);
        }
    }
    
    save_user_closed(&user_closed);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WidgetState::new())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_shared_data,
            close_widget,
            quit_app,
            open_main_app
        ])
        .setup(|app| {
            // Keeper window to keep app alive in background
            let _keeper = WebviewWindowBuilder::new(app, "keeper", WebviewUrl::App("/".into()))
                .inner_size(1.0, 1.0)
                .position(-10000.0, -10000.0)
                .decorations(false)
                .transparent(true)
                .skip_taskbar(true)
                .visible(false)
                .build()?;

            let app_handle = app.app_handle().clone();
            let state: tauri::State<WidgetState> = app.state::<WidgetState>();
            
            // Initial spawn
            let _ = spawn_or_update_widgets(&app_handle, &state);
            
            // Poll for config changes
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(Duration::from_secs(5));
                    let state: tauri::State<WidgetState> = app_handle.state::<WidgetState>();
                    let _ = spawn_or_update_widgets(&app_handle, &state);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
