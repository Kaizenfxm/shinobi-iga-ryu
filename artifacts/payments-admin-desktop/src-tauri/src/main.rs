#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_updater::UpdaterExt;

/// Busca una actualización, la descarga e instala si existe, y reinicia la app.
/// Devuelve la nueva versión si había actualización, o "" si ya es la última.
#[tauri::command]
async fn check_and_install_update(app: tauri::AppHandle) -> Result<String, String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| e.to_string())?;

    match updater.check().await.map_err(|e| e.to_string())? {
        Some(update) => {
            let version = update.version.clone();
            update
                .download_and_install(|_chunk, _total| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            tauri_plugin_process::restart(app.env());
        }
        None => Ok(String::new()),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![check_and_install_update])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
