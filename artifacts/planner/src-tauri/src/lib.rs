use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::webview::WebviewWindowBuilder;
use tauri::WebviewUrl;
use tauri::Manager;
use tauri::RunEvent;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;
use std::env;
use std::collections::HashMap;
use std::sync::Mutex;

// ─── Widget tracking ───────────────────────────────────────────────────────
struct WidgetState(Mutex<HashMap<String, WidgetMeta>>);

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct WidgetMeta {
    label: String,
    title: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

// ─── Commands ─────────────────────────────────────────────────────────────

#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<String>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_deep_link() -> Option<String> {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1].starts_with("taskbattles://") {
        return Some(args[1].clone());
    }
    None
}

#[tauri::command]
fn export_data_for_widgets(
    goals_json: String,
    events_json: String,
    config_json: String,
    rivalry_json: String,
    diary_json: String,
) -> Result<(), String> {
    let local_app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let dir = local_app_data.join("TaskBattles");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("widgets.json");

    let config: serde_json::Value = serde_json::from_str(&config_json)
        .unwrap_or(serde_json::json!({ "widgets": [] }));

    let data = serde_json::json!({
        "goals": serde_json::from_str::<serde_json::Value>(&goals_json).unwrap_or(serde_json::json!([])),
        "events": serde_json::from_str::<serde_json::Value>(&events_json).unwrap_or(serde_json::json!([])),
        "rivalry": serde_json::from_str::<serde_json::Value>(&rivalry_json).unwrap_or(serde_json::json!({})),
        "diary": serde_json::from_str::<serde_json::Value>(&diary_json).unwrap_or(serde_json::json!({})),
        "config": config,
        "exported_at": chrono::Utc::now().to_rfc3339(),
    });

    std::fs::write(&path, serde_json::to_string(&data).unwrap_or_default())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_widget_window(
    app: tauri::AppHandle,
    state: tauri::State<WidgetState>,
    label: String,
    url: String,
    title: String,
    width: f64,
    height: f64,
    x: Option<f64>,
    y: Option<f64>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.close();
    }

    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title(&title)
        .inner_size(width, height)
        .max_inner_size(width, height)
        .min_inner_size(width, height)
        .decorations(false)
        .skip_taskbar(false)
        .transparent(false)
        .resizable(false)
        .visible(true)
        .always_on_top(false)
        .build()
        .map_err(|e| e.to_string())?;

    if let (Some(px), Some(py)) = (x, y) {
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x: px, y: py }));
    } else {
        let _ = window.center();
    }

    let meta = WidgetMeta {
        label: label.clone(),
        title,
        url,
        x: x.unwrap_or(0.0),
        y: y.unwrap_or(0.0),
        width,
        height,
    };

    let mut widgets = state.0.lock().unwrap();
    widgets.insert(label, meta);

    Ok(())
}

#[tauri::command]
fn close_widget_window(
    app: tauri::AppHandle,
    state: tauri::State<WidgetState>,
    label: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    let mut widgets = state.0.lock().unwrap();
    widgets.remove(&label);
    Ok(())
}

#[tauri::command]
fn list_widget_windows(state: tauri::State<WidgetState>) -> Vec<WidgetMeta> {
    let widgets = state.0.lock().unwrap();
    widgets.values().cloned().collect()
}

#[tauri::command]
fn close_all_widgets(
    app: tauri::AppHandle,
    state: tauri::State<WidgetState>,
) -> Result<(), String> {
    let labels: Vec<String> = {
        let widgets = state.0.lock().unwrap();
        widgets.keys().cloned().collect()
    };
    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }
    let mut widgets = state.0.lock().unwrap();
    widgets.clear();
    Ok(())
}

#[tauri::command]
fn save_widget_positions(
    app: tauri::AppHandle,
    state: tauri::State<WidgetState>,
) -> Result<(), String> {
    let widgets = state.0.lock().unwrap();
    let store = app.store("widgets.bin").map_err(|e| e.to_string())?;
    let data: Vec<WidgetMeta> = widgets.values().cloned().collect();
    store.set("widget_layout", serde_json::to_value(&data).unwrap_or_default());
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_widget_positions(app: tauri::AppHandle) -> Result<Vec<WidgetMeta>, String> {
    let store = app.store("widgets.bin").map_err(|e| e.to_string())?;
    let val = store.get("widget_layout").unwrap_or_default();
    let data: Vec<WidgetMeta> = serde_json::from_value(val).unwrap_or_default();
    Ok(data)
}

#[tauri::command]
fn toggle_goal_in_widget(app: tauri::AppHandle, goal_id: String, user_id: String) -> Result<(), String> {
    let store = app.store("widget_toggles.bin").map_err(|e| e.to_string())?;
    let key = format!("toggle_{}", goal_id);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    store.set(&key, serde_json::json!({ "goal_id": goal_id, "user_id": user_id, "ts": now }));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn poll_widget_toggles(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let store = app.store("widget_toggles.bin").map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    for key in store.keys() {
        if key.starts_with("toggle_") {
            if let Some(val) = store.get(&key) {
                results.push(val);
            }
            let _ = store.delete(&key);
        }
    }
    store.save().map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
async fn launch_widget_app() -> Result<(), String> {
    // Check if already running (platform-specific)
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        let output = tokio::process::Command::new("tasklist")
            .args(&["/FI", "IMAGENAME eq task-battles-widgets.exe", "/FO", "CSV", "/NH"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .await
            .map_err(|e| format!("Failed to check running processes: {}", e))?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("task-battles-widgets.exe") {
            return Ok(()); // Already running
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        let output = tokio::process::Command::new("pgrep")
            .arg("-f")
            .arg("Task Battles Widgets")
            .output()
            .await
            .map_err(|e| format!("Failed to check running processes: {}", e))?;
        if output.status.success() {
            return Ok(()); // Already running
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let output = tokio::process::Command::new("pgrep")
            .arg("-f")
            .arg("task-battles-widgets")
            .output()
            .await
            .map_err(|e| format!("Failed to check running processes: {}", e))?;
        if output.status.success() {
            return Ok(()); // Already running
        }
    }

    // Platform-specific installation paths
    #[cfg(target_os = "windows")]
    let possible_paths = vec![
        dirs::data_local_dir().unwrap_or_default()
            .join("Task Battles Widgets")
            .join("task-battles-widgets.exe"),
        dirs::data_local_dir().unwrap_or_default()
            .join("Programs")
            .join("Task Battles Widgets")
            .join("task-battles-widgets.exe"),
        std::path::PathBuf::from("C:\\Program Files\\Task Battles Widgets\\task-battles-widgets.exe"),
        std::path::PathBuf::from("C:\\Program Files (x86)\\Task Battles Widgets\\task-battles-widgets.exe"),
    ];
    
    #[cfg(target_os = "macos")]
    let possible_paths = vec![
        std::path::PathBuf::from("/Applications/Task Battles Widgets.app/Contents/MacOS/Task Battles Widgets"),
        dirs::home_dir().unwrap_or_default()
            .join("Applications")
            .join("Task Battles Widgets.app")
            .join("Contents")
            .join("MacOS")
            .join("Task Battles Widgets"),
    ];
    
    #[cfg(target_os = "linux")]
    let possible_paths = vec![
        dirs::home_dir().unwrap_or_default()
            .join(".local")
            .join("bin")
            .join("task-battles-widgets"),
        std::path::PathBuf::from("/usr/bin/task-battles-widgets"),
        std::path::PathBuf::from("/usr/local/bin/task-battles-widgets"),
    ];
    
    for path in possible_paths {
        if path.exists() {
            match std::process::Command::new(&path).spawn() {
                Ok(_) => return Ok(()),
                Err(e) => return Err(format!("Found widget app at {:?} but failed to launch: {}", path, e)),
            }
        }
    }
    
    Err("Task Battles Widgets app not found. Please install it first.".to_string())
}

#[tauri::command]
fn read_pending_actions() -> Result<Vec<serde_json::Value>, String> {
    let path = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?
        .join("TaskBattles")
        .join("pending-actions.json");

    if !path.exists() {
        return Ok(Vec::new());
    }

    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read pending actions: {}", e))?;

    let actions: Vec<serde_json::Value> = serde_json::from_str(&contents)
        .unwrap_or_default();

    // Clear the file after reading
    std::fs::write(&path, "[]").map_err(|e| e.to_string())?;

    Ok(actions)
}

// ─── Main ───────────────────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
fn configure_linux_webview() {
    // WebKitGTK can render a blank window when DMABUF or compositing is
    // incompatible with the user's Wayland/X11 graphics stack. Respect an
    // existing value so advanced users can opt into their preferred mode.
    if env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    if env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
        env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    configure_linux_webview();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(WidgetState(Mutex::new(HashMap::new())))
.invoke_handler(tauri::generate_handler![
            open_external,
            get_deep_link,
            export_data_for_widgets,
            create_widget_window,
            close_widget_window,
            list_widget_windows,
            close_all_widgets,
            save_widget_positions,
            load_widget_positions,
            toggle_goal_in_widget,
            poll_widget_toggles,
            read_pending_actions,
            launch_widget_app
        ]);

    builder = builder.setup(|app| {
        let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
        let show = MenuItem::with_id(app, "show", "Show Task Battles", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show, &PredefinedMenuItem::separator(app)?, &quit])?;

        let _app_handle = app.handle().clone();
        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .on_menu_event(move |app, event| match event.id().as_ref() {
                "quit" => {
                    app.exit(0);
                }
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            })
            .on_tray_icon_event(move |tray, event| {
                if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            })
            .build(app)?;

        // Enable autostart (cross-platform)
        {
            use tauri_plugin_autostart::ManagerExt;
            match app.autolaunch().enable() {
                Ok(_) => println!("[TaskBattles] Autostart enabled"),
                Err(e) => eprintln!("[TaskBattles] Failed to enable autostart: {}", e),
            }
        }

        // Check if --hidden flag was passed (autostart)
        let args: Vec<String> = env::args().collect();
        let hidden = args.contains(&"--hidden".to_string());

        if hidden {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            // Restore saved widgets
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Give a moment for plugins to init
                std::thread::sleep(std::time::Duration::from_millis(300));
                if let Ok(widgets) = load_widget_positions(app_handle.clone()) {
                    for w in widgets {
                        let _ = create_widget_window(
                            app_handle.clone(),
                            app_handle.state::<WidgetState>(),
                            w.label,
                            w.url,
                            w.title,
                            w.width,
                            w.height,
                            Some(w.x),
                            Some(w.y),
                        );
                    }
                }
            });
        }

        Ok(())
    });

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        match event {
            RunEvent::WindowEvent { label, event: win_event, .. } => {
                if label == "main" {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = win_event {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.hide();
                        }
                        api.prevent_close();
                    }
                }
            }
            _ => {}
        }
    });
}
