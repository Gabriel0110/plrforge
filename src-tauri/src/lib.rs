mod assets;
mod save;

use save::{DiscoveredPlayer, PlayerDocument, SavePlayerRequest, SaveReceipt};
use tauri::AppHandle;

#[tauri::command]
fn discover_players() -> Result<Vec<DiscoveredPlayer>, String> {
    save::discover_players().map_err(|error| error.to_string())
}

#[tauri::command]
fn load_player(path: String) -> Result<PlayerDocument, String> {
    save::load_player(&path).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_player(request: SavePlayerRequest) -> Result<SaveReceipt, String> {
    save::save_player(request).map_err(|error| error.to_string())
}

#[tauri::command]
async fn prepare_game_assets(
    app: AppHandle,
    source_path: Option<String>,
) -> Result<assets::GameAssetStatus, String> {
    let stored = source_path.or_else(|| assets::stored_source(&app));
    let task_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        match assets::prepare(&task_app, stored.as_deref()) {
            Ok(status) => status,
            Err(
                error @ (assets::AssetError::SourceNotFound | assets::AssetError::InvalidSource),
            ) => assets::missing_status(&error),
            Err(error) => assets::GameAssetStatus {
                state: "error".into(),
                source_path: stored,
                cache_path: None,
                item_count: 0,
                buff_count: 0,
                message: error.to_string(),
            },
        }
    })
    .await
    .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            discover_players,
            load_player,
            save_player,
            prepare_game_assets
        ])
        .run(tauri::generate_context!())
        .expect("error while running PlrForge");
}
