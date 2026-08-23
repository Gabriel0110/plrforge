mod crypto;
mod v325;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use thiserror::Error;

pub use v325::{CharacterDocument, EquipmentDocument, ItemSlot, PlayerDocument, StorageDocument};

#[derive(Debug, Error)]
pub enum SaveError {
    #[error("This does not look like a .plr player file: {0}")]
    InvalidPath(String),
    #[error("Could not read or write the player file: {0}")]
    Io(#[from] std::io::Error),
    #[error("The encrypted player file is damaged or incomplete")]
    Crypto,
    #[error("Player file {0} is not supported yet. PlrForge currently supports version 325")]
    UnsupportedVersion(i32),
    #[error("The player file is truncated or has an invalid v325 layout")]
    Truncated,
    #[error("The player file changed after it was opened. Reload it before saving")]
    SourceChanged,
    #[error("Player edit validation failed: {0}")]
    Validation(String),
    #[error("The staged save could not be verified: {0}")]
    Verification(String),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredPlayer {
    pub path: String,
    pub name: String,
    pub version: i32,
    pub modified_at: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePlayerRequest {
    pub path: String,
    pub source_hash: String,
    pub character: CharacterDocument,
    pub inventory: Vec<ItemSlot>,
    pub equipment: EquipmentDocument,
    pub storage: StorageDocument,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveReceipt {
    pub backup_path: String,
    pub source_hash: String,
    pub saved_at: String,
}

pub fn discover_players() -> Result<Vec<DiscoveredPlayer>, SaveError> {
    let mut roots = Vec::new();
    if cfg!(target_os = "macos") {
        if let Some(home) = dirs::home_dir() {
            roots.push(home.join("Library/Application Support/Terraria/Players"));
        }
    } else if cfg!(target_os = "windows") {
        if let Some(documents) = dirs::document_dir() {
            roots.push(documents.join("My Games/Terraria/Players"));
        }
    } else if let Some(data) = dirs::data_local_dir() {
        roots.push(data.join("Terraria/Players"));
    }

    let mut players = Vec::new();
    for root in roots {
        let Ok(entries) = fs::read_dir(root) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("plr") {
                continue;
            }
            let Ok(document) = load_path(&path) else {
                continue;
            };
            let modified_at = entry
                .metadata()
                .and_then(|metadata| metadata.modified())
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map_or(0, |duration| duration.as_secs());
            players.push(DiscoveredPlayer {
                path: path.to_string_lossy().into_owned(),
                name: document.character.name,
                version: document.version,
                modified_at,
            });
        }
    }
    players.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));
    Ok(players)
}

pub fn load_player(path: &str) -> Result<PlayerDocument, SaveError> {
    let path = checked_path(path)?;
    load_path(&path)
}

fn load_path(path: &Path) -> Result<PlayerDocument, SaveError> {
    let encrypted = fs::read(path)?;
    let source_hash = hash(&encrypted);
    let plaintext = crypto::decrypt(&encrypted)?;
    v325::parse(path, &source_hash, &plaintext)
}

pub fn save_player(request: SavePlayerRequest) -> Result<SaveReceipt, SaveError> {
    let path = checked_path(&request.path)?;
    v325::validate_document(
        &request.character,
        &request.inventory,
        &request.equipment,
        &request.storage,
    )?;

    let encrypted = fs::read(&path)?;
    if hash(&encrypted) != request.source_hash {
        return Err(SaveError::SourceChanged);
    }
    let plaintext = crypto::decrypt(&encrypted)?;
    let patched = v325::patch_document(
        &plaintext,
        &request.character,
        &request.inventory,
        &request.equipment,
        &request.storage,
    )?;
    let staged_encrypted = crypto::encrypt(&patched)?;

    let backup_dir = path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(".plrforge-backups");
    fs::create_dir_all(&backup_dir)?;
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("player");
    let timestamp = Utc::now().format("%Y%m%dT%H%M%SZ");
    let backup_path = backup_dir.join(format!("{stem}-{timestamp}.plr"));
    fs::copy(&path, &backup_path)?;

    let stage_path = staged_path(&path);
    fs::write(&stage_path, &staged_encrypted)?;
    let staged_plaintext = crypto::decrypt(&fs::read(&stage_path)?)?;
    if !staged_plaintext.starts_with(&patched)
        || staged_plaintext[patched.len()..]
            .iter()
            .any(|byte| *byte != 0)
    {
        let _ = fs::remove_file(&stage_path);
        return Err(SaveError::Verification(
            "encrypted round trip did not reproduce the patched payload".into(),
        ));
    }
    let verified = v325::parse(&stage_path, &hash(&staged_encrypted), &staged_plaintext)?;
    if verified.character != request.character
        || verified.inventory != request.inventory
        || verified.equipment != request.equipment
        || verified.storage != request.storage
    {
        let _ = fs::remove_file(&stage_path);
        return Err(SaveError::Verification(
            "re-opened character or item data does not match the requested edit".into(),
        ));
    }

    replace_file(&stage_path, &path)?;
    let saved_bytes = fs::read(&path)?;
    Ok(SaveReceipt {
        backup_path: backup_path.to_string_lossy().into_owned(),
        source_hash: hash(&saved_bytes),
        saved_at: Utc::now().to_rfc3339(),
    })
}

fn checked_path(value: &str) -> Result<PathBuf, SaveError> {
    let path = PathBuf::from(value);
    if path.extension().and_then(|extension| extension.to_str()) != Some("plr") {
        return Err(SaveError::InvalidPath(value.into()));
    }
    Ok(path)
}

fn staged_path(path: &Path) -> PathBuf {
    let filename = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("player.plr");
    path.with_file_name(format!(".{filename}.plrforge-{}.tmp", std::process::id()))
}

#[cfg(not(target_os = "windows"))]
fn replace_file(stage: &Path, destination: &Path) -> Result<(), SaveError> {
    fs::rename(stage, destination)?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn replace_file(stage: &Path, destination: &Path) -> Result<(), SaveError> {
    let rollback = destination.with_extension("plr.plrforge-rollback");
    fs::rename(destination, &rollback)?;
    if let Err(error) = fs::rename(stage, destination) {
        let _ = fs::rename(&rollback, destination);
        return Err(error.into());
    }
    let _ = fs::remove_file(rollback);
    Ok(())
}

fn hash(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn external_fixture_completes_guarded_noop_save_when_configured() {
        let Ok(source) = std::env::var("PLRFORGE_FIXTURE") else {
            return;
        };
        let temporary = tempfile::tempdir().unwrap();
        let copy = temporary.path().join("fixture.plr");
        fs::copy(source, &copy).unwrap();

        let before = load_path(&copy).unwrap();
        let receipt = save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: before.source_hash.clone(),
            character: before.character.clone(),
            inventory: before.inventory.clone(),
            equipment: before.equipment.clone(),
            storage: before.storage.clone(),
        })
        .unwrap();
        let after = load_path(&copy).unwrap();

        assert_eq!(before.character, after.character);
        assert_eq!(before.version, after.version);
        assert_eq!(before.inventory, after.inventory);
        assert_eq!(before.equipment, after.equipment);
        assert_eq!(before.storage, after.storage);
        assert!(Path::new(&receipt.backup_path).exists());
        eprintln!(
            "verified {} v{} with inventory, equipment, and storage records; backup created",
            after.character.name, after.version
        );
    }

    #[test]
    fn external_fixture_mutates_each_phase_two_region_when_configured() {
        let Ok(source) = std::env::var("PLRFORGE_FIXTURE") else {
            return;
        };
        let temporary = tempfile::tempdir().unwrap();
        let copy = temporary.path().join("mutated-fixture.plr");
        fs::copy(source, &copy).unwrap();

        let mut before = load_path(&copy).unwrap();
        let inventory_slot = before
            .inventory
            .iter()
            .position(|item| item.item_id == 0)
            .expect("fixture needs one empty inventory slot");
        before.inventory[inventory_slot] = ItemSlot {
            slot: inventory_slot as u8,
            item_id: 3043,
            stack: 1,
            prefix: 0,
            favorited: true,
        };
        let safe_slot = before
            .storage
            .safe
            .iter()
            .position(|item| item.item_id == 0)
            .expect("fixture needs one empty Safe slot");
        before.storage.safe[safe_slot] = ItemSlot {
            slot: safe_slot as u8,
            item_id: 2768,
            stack: 1,
            prefix: 0,
            favorited: false,
        };
        let inactive = (before.equipment.current_loadout_index as usize + 1) % 3;
        before.equipment.loadouts[inactive].armor[0] = ItemSlot {
            slot: 0,
            item_id: 90,
            stack: 1,
            prefix: 0,
            favorited: false,
        };

        save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: before.source_hash.clone(),
            character: before.character.clone(),
            inventory: before.inventory.clone(),
            equipment: before.equipment.clone(),
            storage: before.storage.clone(),
        })
        .unwrap();
        let after = load_path(&copy).unwrap();
        assert_eq!(after.inventory[inventory_slot].item_id, 3043);
        assert_eq!(after.storage.safe[safe_slot].item_id, 2768);
        assert_eq!(after.equipment.loadouts[inactive].armor[0].item_id, 90);
    }

    #[test]
    fn external_fixture_mutates_character_region_when_configured() {
        let Ok(source) = std::env::var("PLRFORGE_FIXTURE") else {
            return;
        };
        let temporary = tempfile::tempdir().unwrap();
        let copy = temporary.path().join("character-fixture.plr");
        fs::copy(source, &copy).unwrap();

        let mut before = load_path(&copy).unwrap();
        before.character.name = "ForgeTest".into();
        before.character.stats.life = 499;
        before.character.appearance.hair = 42;
        before.character.appearance.hair_color.r ^= 0xff;
        before.character.appearance.voice_variant = 4;
        before.character.appearance.voice_pitch = -0.5;
        before.character.upgrades.used_ambrosia = !before.character.upgrades.used_ambrosia;
        before.character.counters.pve_deaths += 1;

        save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: before.source_hash.clone(),
            character: before.character.clone(),
            inventory: before.inventory.clone(),
            equipment: before.equipment.clone(),
            storage: before.storage.clone(),
        })
        .unwrap();
        let after = load_path(&copy).unwrap();
        assert_eq!(after.character, before.character);
        assert_eq!(after.inventory, before.inventory);
        assert_eq!(after.equipment, before.equipment);
        assert_eq!(after.storage, before.storage);
    }
}
