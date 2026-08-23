mod assets;
mod save;
mod updates;

use save::{
    BackupEntry, DiscoveredPlayer, PlayerCompatibility, PlayerDocument, RestoreReceipt,
    SavePlayerRequest, SaveReceipt,
};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn discover_players() -> Result<Vec<DiscoveredPlayer>, String> {
    save::discover_players().map_err(|error| error.to_string())
}

#[tauri::command]
fn load_player(path: String) -> Result<PlayerDocument, String> {
    save::load_player(&path).map_err(|error| error.to_string())
}

#[tauri::command]
fn inspect_player(path: String) -> Result<PlayerCompatibility, String> {
    save::inspect_player(&path).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_player(request: SavePlayerRequest) -> Result<SaveReceipt, String> {
    save::save_player(request).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_backups(player_path: String) -> Result<Vec<BackupEntry>, String> {
    save::list_backups(&player_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn restore_backup(player_path: String, backup_path: String) -> Result<RestoreReceipt, String> {
    save::restore_backup(&player_path, &backup_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn reveal_backup(app: AppHandle, player_path: String, backup_path: String) -> Result<(), String> {
    let backup =
        save::checked_backup_path(&player_path, &backup_path).map_err(|error| error.to_string())?;
    app.opener()
        .reveal_item_in_dir(backup)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<updates::UpdateStatus, String> {
    Ok(updates::check(&app.package_info().version.to_string()).await)
}

#[tauri::command]
fn open_release_page(app: AppHandle, url: String) -> Result<(), String> {
    if !updates::release_url_allowed(&url) {
        return Err(
            "The release URL is not part of PlrForge's configured GitHub repository.".into(),
        );
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| error.to_string())
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            discover_players,
            inspect_player,
            load_player,
            save_player,
            list_backups,
            restore_backup,
            reveal_backup,
            check_for_updates,
            open_release_page,
            prepare_game_assets
        ])
        .run(tauri::generate_context!())
        .expect("error while running PlrForge");
}
