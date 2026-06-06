use tauri::{Manager, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_opener::OpenerExt;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

// ─── State ────────────────────────────────────────────────────────────────────

struct WidgetState {
    user_closed: Mutex<HashSet<String>>,
    window_positions: Mutex<HashMap<String, WindowPos>>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct WindowPos {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl WidgetState {
    fn new() -> Self {
        Self {
            user_closed: Mutex::new(load_user_closed()),
            window_positions: Mutex::new(load_positions()),
        }
    }
}

fn state_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_default()
        .join("TaskBattles")
}

fn user_closed_path() -> PathBuf {
    state_path().join("widget-state.json")
}

fn positions_path() -> PathBuf {
    state_path().join("widget-positions.json")
}

fn load_user_closed() -> HashSet<String> {
    if let Ok(contents) = std::fs::read_to_string(user_closed_path()) {
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
    let _ = std::fs::create_dir_all(state_path());
    let _ = std::fs::write(user_closed_path(), serde_json::to_string(&data).unwrap_or_default());
}

fn load_positions() -> HashMap<String, WindowPos> {
    if let Ok(contents) = std::fs::read_to_string(positions_path()) {
        if let Ok(map) = serde_json::from_str::<HashMap<String, WindowPos>>(&contents) {
            return map;
        }
    }
    HashMap::new()
}

fn save_positions(map: &HashMap<String, WindowPos>) {
    let _ = std::fs::create_dir_all(state_path());
    let _ = std::fs::write(positions_path(), serde_json::to_string(map).unwrap_or_default());
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

#[tauri::command]
fn write_action(action_json: String) -> Result<(), String> {
    let path = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?
        .join("TaskBattles")
        .join("pending-actions.json");

    let dir = path.parent().unwrap();
    let _ = std::fs::create_dir_all(dir);

    let mut actions: Vec<serde_json::Value> = if path.exists() {
        let contents = std::fs::read_to_string(&path).unwrap_or("[]".to_string());
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        Vec::new()
    };

    let action: serde_json::Value = serde_json::from_str(&action_json)
        .map_err(|e| format!("Invalid action JSON: {}", e))?;
    actions.push(action);

    std::fs::write(&path, serde_json::to_string(&actions).unwrap_or("[]".to_string()))
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ─── Save widget window positions ─────────────────────────────────────────────

fn save_current_positions(app: &tauri::AppHandle, state: &tauri::State<WidgetState>) {
    let mut positions = state.window_positions.lock().unwrap();
    for (label, window) in app.webview_windows() {
        if !label.starts_with("widget-") { continue; }
        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.inner_size()) {
            let id = label.strip_prefix("widget-").unwrap_or(&label).to_string();
            positions.insert(id, WindowPos {
                x: pos.x as f64,
                y: pos.y as f64,
                width: size.width as f64,
                height: size.height as f64,
            });
        }
    }
    save_positions(&positions);
}

// ─── Widget window spawner ────────────────────────────────────────────────────

fn spawn_or_update_widgets(app: &tauri::AppHandle, state: &tauri::State<WidgetState>) -> Result<(), String> {
    let data = read_shared_data()?;
    let config = data.get("config").cloned().unwrap_or(serde_json::json!({ "widgets": [] }));
    let widgets = config.get("widgets").and_then(|w| w.as_array()).cloned().unwrap_or_default();
    
    // Ghost widget safeguard: don't spawn widgets if the main app hasn't exported data yet
    if data.get("exported_at").is_none() {
        return Ok(());
    }

    // Save current positions before potentially closing windows
    save_current_positions(app, state);
    
    let mut expected_labels: Vec<String> = Vec::new();
    let mut user_closed = state.user_closed.lock().unwrap();
    let positions = state.window_positions.lock().unwrap();
    
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
        
        // Use saved position if available, otherwise cascade
        let saved_pos = positions.get(&id);
        let x = saved_pos.map(|p| p.x).unwrap_or_else(|| 50.0 + (index as f64 * 30.0));
        let y = saved_pos.map(|p| p.y).unwrap_or_else(|| 50.0 + (index as f64 * 30.0));
        let (default_w, default_h) = match widget_type.as_str() {
            "progress" => (240.0, 260.0),
            "events" => (280.0, 300.0),
            "rivalry" => (280.0, 220.0),
            "calendar" => (260.0, 280.0),
            "dayview" => (300.0, 340.0),
            "diary" => (300.0, 320.0),
            _ => (280.0, 360.0),
        };
        let width = saved_pos.map(|p| p.width).unwrap_or(default_w);
        let height = saved_pos.map(|p| p.height).unwrap_or(default_h);
        
        let url = format!("/?widget={}&theme={}&translucent={}", widget_type, theme, translucent);
        
        let _ = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
            .title(&id)
            .inner_size(width, height)
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
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            read_shared_data,
            close_widget,
            quit_app,
            open_main_app,
            write_action
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
            
            // Poll for config changes and save positions periodically
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