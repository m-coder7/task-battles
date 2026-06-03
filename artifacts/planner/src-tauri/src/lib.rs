use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::webview::WebviewWindowBuilder;
use tauri::WebviewUrl;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use std::env;
use std::collections::HashMap;
use std::sync::Mutex;

// Track active widget labels so the frontend can list them
struct WidgetState(Mutex<HashMap<String, WidgetMeta>>);

#[derive(Clone, serde::Serialize)]
struct WidgetMeta {
    label: String,
    title: String,
    url: String,
}

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
fn create_widget_window(
    app: tauri::AppHandle,
    state: tauri::State<WidgetState>,
    label: String,
    url: String,
    title: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    // Close existing widget with same label
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.close();
    }

    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.clone().into()))
        .title(&title)
        .inner_size(width, height)
        .max_inner_size(width, height)
        .min_inner_size(width, height)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .transparent(true)
        .resizable(false)
        .visible(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Center on screen (or offset slightly from main window)
    let _ = window.center();

    let mut widgets = state.0.lock().unwrap();
    widgets.insert(label.clone(), WidgetMeta { label, title, url });

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(WidgetState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            open_external,
            get_deep_link,
            create_widget_window,
            close_widget_window,
            list_widget_windows,
            close_all_widgets,
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
