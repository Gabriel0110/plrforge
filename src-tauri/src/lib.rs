mod save;

use save::{DiscoveredPlayer, PlayerDocument, SavePlayerRequest, SaveReceipt};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            discover_players,
            load_player,
            save_player
        ])
        .run(tauri::generate_context!())
        .expect("error while running PlrForge");
}
