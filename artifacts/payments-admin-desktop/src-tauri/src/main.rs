#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_updater::UpdaterExt;

/// Busca, descarga e instala la actualización si existe.
/// Devuelve la nueva versión (String no vacío) o "" si ya es la última.
/// Tras instalar llama a app.exit(0) para que el usuario reabra con la versión nueva.
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
            // Cierra la app; el usuario la reabre con la versión nueva ya instalada
            app.exit(0);
            Ok(version) // satisface el tipo; no se alcanza tras exit
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
