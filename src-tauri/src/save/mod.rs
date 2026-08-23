mod codec;
mod crypto;
mod v325;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use thiserror::Error;

pub use codec::PlayerCompatibility;
pub use v325::{
    CharacterDocument, EffectsDocument, EquipmentDocument, ItemSlot, JourneyDocument,
    PlayerDocument, SpawnPoint, StorageDocument,
};

#[derive(Debug, Error)]
pub enum SaveError {
    #[error("This does not look like a .plr player file: {0}")]
    InvalidPath(String),
    #[error("Could not read or write the player file: {0}")]
    Io(#[from] std::io::Error),
    #[error("The encrypted player file is damaged or incomplete")]
    Crypto,
    #[error(
        "Player file v{0} is not editable in this build. PlrForge's latest verified format is v325"
    )]
    UnsupportedVersion(i32),
    #[error("The player file is truncated or has an invalid supported layout")]
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
    pub compatibility: PlayerCompatibility,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePlayerRequest {
    pub path: String,
    pub source_hash: String,
    pub character: CharacterDocument,
    pub effects: EffectsDocument,
    pub journey: JourneyDocument,
    pub spawn_points: Vec<SpawnPoint>,
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupEntry {
    pub path: String,
    pub file_name: String,
    pub size: u64,
    pub modified_at: String,
    pub character_name: Option<String>,
    pub version: Option<i32>,
    pub compatible: bool,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreReceipt {
    pub safety_backup_path: String,
    pub restored_at: String,
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
            let Ok((compatibility, document)) = inspect_path(&path) else {
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
                name: document
                    .as_ref()
                    .map(|value| value.character.name.clone())
                    .or_else(|| {
                        path.file_stem()
                            .and_then(|value| value.to_str())
                            .map(str::to_owned)
                    })
                    .unwrap_or_else(|| "Unknown player".into()),
                version: compatibility.file_version,
                modified_at,
                compatibility,
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

pub fn inspect_player(path: &str) -> Result<PlayerCompatibility, SaveError> {
    let path = checked_path(path)?;
    inspect_path(&path).map(|(compatibility, _)| compatibility)
}

fn inspect_path(path: &Path) -> Result<(PlayerCompatibility, Option<PlayerDocument>), SaveError> {
    let encrypted = fs::read(path)?;
    let source_hash = hash(&encrypted);
    let plaintext = crypto::decrypt(&encrypted)?;
    let compatibility = codec::inspect_plaintext(&plaintext)?;
    let document = if compatibility.can_edit {
        Some(codec::parse_document(path, &source_hash, &plaintext)?)
    } else {
        None
    };
    Ok((compatibility, document))
}

fn load_path(path: &Path) -> Result<PlayerDocument, SaveError> {
    let encrypted = fs::read(path)?;
    let source_hash = hash(&encrypted);
    let plaintext = crypto::decrypt(&encrypted)?;
    codec::parse_document(path, &source_hash, &plaintext)
}

pub fn save_player(request: SavePlayerRequest) -> Result<SaveReceipt, SaveError> {
    let path = checked_path(&request.path)?;
    let encrypted = fs::read(&path)?;
    if hash(&encrypted) != request.source_hash {
        return Err(SaveError::SourceChanged);
    }
    let plaintext = crypto::decrypt(&encrypted)?;
    let codec = codec::codec_for_plaintext(&plaintext)?;
    codec.validate(&request)?;
    let patched = codec.patch(&plaintext, &request)?;
    let staged_encrypted = crypto::encrypt(&patched)?;

    let backup_path = create_backup_copy(&path, None)?;

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
    let verified = codec.parse(&stage_path, &hash(&staged_encrypted), &staged_plaintext)?;
    if verified.character != request.character
        || verified.effects != request.effects
        || verified.journey != request.journey
        || verified.spawn_points != request.spawn_points
        || verified.inventory != request.inventory
        || verified.equipment != request.equipment
        || verified.storage != request.storage
    {
        let _ = fs::remove_file(&stage_path);
        return Err(SaveError::Verification(
            "re-opened character data does not match the requested edit".into(),
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

pub fn list_backups(player_path: &str) -> Result<Vec<BackupEntry>, SaveError> {
    let player = checked_path(player_path)?;
    let directory = backup_dir_for(&player);
    let Ok(entries) = fs::read_dir(directory) else {
        return Ok(Vec::new());
    };
    let stem = player
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("player");
    let prefix = format!("{stem}-");
    let mut backups = entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            let file_name = path.file_name()?.to_str()?.to_owned();
            if path.extension().and_then(|value| value.to_str()) != Some("plr")
                || !file_name.starts_with(&prefix)
            {
                return None;
            }
            let metadata = entry.metadata().ok()?;
            let modified = metadata.modified().ok();
            let modified_at = modified
                .map(chrono::DateTime::<Utc>::from)
                .map_or_else(String::new, |value| value.to_rfc3339());
            let loaded = load_path(&path);
            let (character_name, version, compatible, detail) = match loaded {
                Ok(document) => (
                    Some(document.character.name),
                    Some(document.version),
                    true,
                    codec::classify_version(document.version).format_label,
                ),
                Err(error) => (None, None, false, error.to_string()),
            };
            Some(BackupEntry {
                path: path.to_string_lossy().into_owned(),
                file_name,
                size: metadata.len(),
                modified_at,
                character_name,
                version,
                compatible,
                detail,
            })
        })
        .collect::<Vec<_>>();
    backups.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));
    Ok(backups)
}

pub fn restore_backup(player_path: &str, backup_path: &str) -> Result<RestoreReceipt, SaveError> {
    let player = checked_path(player_path)?;
    let backup = checked_backup_path_for(&player, backup_path)?;
    let encrypted = fs::read(&backup)?;
    let plaintext = crypto::decrypt(&encrypted)?;
    codec::parse_document(&backup, &hash(&encrypted), &plaintext)?;

    let safety_backup = create_backup_copy(&player, Some("pre-restore"))?;
    let stage = staged_path(&player);
    fs::write(&stage, &encrypted)?;
    let verification = (|| {
        let staged_bytes = fs::read(&stage)?;
        let staged_plaintext = crypto::decrypt(&staged_bytes)?;
        codec::parse_document(&stage, &hash(&staged_bytes), &staged_plaintext)?;
        Ok::<(), SaveError>(())
    })();
    if let Err(error) = verification {
        let _ = fs::remove_file(&stage);
        return Err(error);
    }
    replace_file(&stage, &player)?;

    Ok(RestoreReceipt {
        safety_backup_path: safety_backup.to_string_lossy().into_owned(),
        restored_at: Utc::now().to_rfc3339(),
    })
}

pub fn checked_backup_path(player_path: &str, backup_path: &str) -> Result<PathBuf, SaveError> {
    checked_backup_path_for(&checked_path(player_path)?, backup_path)
}

fn checked_backup_path_for(player: &Path, backup_path: &str) -> Result<PathBuf, SaveError> {
    let backup = checked_path(backup_path)?;
    let directory = backup_dir_for(player);
    let canonical_directory = directory.canonicalize()?;
    let canonical_backup = backup.canonicalize()?;
    let stem = player
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("player");
    let expected_prefix = format!("{stem}-");
    let valid_name = canonical_backup
        .file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|name| name.starts_with(&expected_prefix) && name.ends_with(".plr"));
    if canonical_backup.parent() != Some(canonical_directory.as_path()) || !valid_name {
        return Err(SaveError::InvalidPath(backup_path.into()));
    }
    Ok(canonical_backup)
}

fn backup_dir_for(path: &Path) -> PathBuf {
    path.parent()
        .unwrap_or_else(|| Path::new("."))
        .join(".plrforge-backups")
}

fn create_backup_copy(path: &Path, label: Option<&str>) -> Result<PathBuf, SaveError> {
    let backup_dir = backup_dir_for(path);
    fs::create_dir_all(&backup_dir)?;
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("player");
    let timestamp = Utc::now().format("%Y%m%dT%H%M%S%.3fZ");
    let label = label.map_or_else(String::new, |value| format!("-{value}"));
    let backup_path = backup_dir.join(format!("{stem}{label}-{timestamp}.plr"));
    fs::copy(path, &backup_path)?;
    Ok(backup_path)
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
    fn backup_paths_cannot_escape_the_active_players_history() {
        let temporary = tempfile::tempdir().unwrap();
        let player = temporary.path().join("Hero.plr");
        fs::write(&player, b"player").unwrap();
        let backup_directory = backup_dir_for(&player);
        fs::create_dir_all(&backup_directory).unwrap();
        let valid = backup_directory.join("Hero-20260823.plr");
        let wrong_player = backup_directory.join("SomeoneElse-20260823.plr");
        let outside = temporary.path().join("Hero-outside.plr");
        fs::write(&valid, b"backup").unwrap();
        fs::write(&wrong_player, b"backup").unwrap();
        fs::write(&outside, b"backup").unwrap();

        assert!(checked_backup_path_for(&player, &valid.to_string_lossy()).is_ok());
        assert!(checked_backup_path_for(&player, &wrong_player.to_string_lossy()).is_err());
        assert!(checked_backup_path_for(&player, &outside.to_string_lossy()).is_err());
    }

    #[test]
    fn external_fixture_completes_guarded_noop_save_when_configured() {
        let Ok(source) = std::env::var("PLRFORGE_FIXTURE") else {
            return;
        };
        let temporary = tempfile::tempdir().unwrap();
        let copy = temporary.path().join("fixture.plr");
        fs::copy(source, &copy).unwrap();
        let original_encrypted = fs::read(&copy).unwrap();

        let before = load_path(&copy).unwrap();
        let receipt = save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: before.source_hash.clone(),
            character: before.character.clone(),
            effects: before.effects.clone(),
            journey: before.journey.clone(),
            spawn_points: before.spawn_points.clone(),
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
        assert_eq!(fs::read(&copy).unwrap(), original_encrypted);
        assert_eq!(fs::read(&receipt.backup_path).unwrap(), original_encrypted);
        assert_eq!(receipt.source_hash, before.source_hash);
        eprintln!(
            "verified byte-identical no-op round trip for {} v{} across character, item, effect, Journey, and spawn records; backup created",
            after.character.name, after.version
        );
    }

    #[test]
    fn compatibility_probe_refuses_unverified_formats_before_parsing() {
        for (version, expected_state) in [
            (324, codec::CompatibilityState::Untested),
            (326, codec::CompatibilityState::Unsupported),
        ] as [(i32, codec::CompatibilityState); 2]
        {
            let temporary = tempfile::tempdir().unwrap();
            let path = temporary.path().join(format!("v{version}.plr"));
            let mut plaintext = vec![0u8; 16];
            plaintext[..4].copy_from_slice(&version.to_le_bytes());
            fs::write(&path, crypto::encrypt(&plaintext).unwrap()).unwrap();

            let compatibility = inspect_player(&path.to_string_lossy()).unwrap();
            assert_eq!(compatibility.state, expected_state);
            assert!(!compatibility.can_edit);
            assert!(matches!(
                load_path(&path),
                Err(SaveError::UnsupportedVersion(found)) if found == version
            ));
        }
    }

    #[test]
    fn external_fixture_lists_and_restores_a_verified_backup_when_configured() {
        let Ok(source) = std::env::var("PLRFORGE_FIXTURE") else {
            return;
        };
        let temporary = tempfile::tempdir().unwrap();
        let copy = temporary.path().join("restore-fixture.plr");
        fs::copy(source, &copy).unwrap();

        let original = load_path(&copy).unwrap();
        let mut edited = original.clone();
        edited.character.name = "RestoreTest".into();
        save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: edited.source_hash.clone(),
            character: edited.character,
            effects: edited.effects,
            journey: edited.journey,
            spawn_points: edited.spawn_points,
            inventory: edited.inventory,
            equipment: edited.equipment,
            storage: edited.storage,
        })
        .unwrap();

        let backups = list_backups(&copy.to_string_lossy()).unwrap();
        assert_eq!(backups.len(), 1);
        assert!(backups[0].compatible);
        assert_eq!(
            backups[0].character_name.as_deref(),
            Some(original.character.name.as_str())
        );

        let receipt = restore_backup(&copy.to_string_lossy(), &backups[0].path).unwrap();
        assert!(Path::new(&receipt.safety_backup_path).exists());
        assert_eq!(load_path(&copy).unwrap().character, original.character);
        assert_eq!(list_backups(&copy.to_string_lossy()).unwrap().len(), 2);
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
            .position(|item| item.item_id != 3043)
            .expect("fixture needs one inventory slot that is not already a Magic Lantern");
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
            .position(|item| item.item_id != 2768)
            .expect("fixture needs one Safe slot that is not already a Drill Containment Unit");
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
            effects: before.effects.clone(),
            journey: before.journey.clone(),
            spawn_points: before.spawn_points.clone(),
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
        if before.version >= 280 {
            before.character.appearance.voice_variant = 4;
        }
        if before.version >= 281 {
            before.character.appearance.voice_pitch = -0.5;
        }
        before.character.upgrades.used_ambrosia = !before.character.upgrades.used_ambrosia;
        before.character.counters.pve_deaths += 1;

        save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: before.source_hash.clone(),
            character: before.character.clone(),
            effects: before.effects.clone(),
            journey: before.journey.clone(),
            spawn_points: before.spawn_points.clone(),
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

    #[test]
    fn external_fixture_mutates_remaining_character_systems_when_configured() {
        let Ok(source) = std::env::var("PLRFORGE_FIXTURE") else {
            return;
        };
        let temporary = tempfile::tempdir().unwrap();
        let copy = temporary.path().join("systems-fixture.plr");
        fs::copy(source, &copy).unwrap();

        let mut before = load_path(&copy).unwrap();
        let buff_slot = before
            .effects
            .buffs
            .iter()
            .position(|buff| buff.buff_id == 0)
            .expect("fixture needs an empty buff slot");
        before.effects.buffs[buff_slot].buff_id = 5;
        before.effects.buffs[buff_slot].time = 3600;
        before.spawn_points.push(SpawnPoint {
            x: 123,
            y: 456,
            world_id: 789,
            world_name: "PlrForge QA".into(),
        });
        if let Some(entry) = before
            .journey
            .research
            .iter_mut()
            .find(|entry| entry.persistent_id == "MagicLantern")
        {
            entry.count = 9999;
        } else {
            before.journey.research.push(v325::ResearchEntry {
                persistent_id: "MagicLantern".into(),
                count: 9999,
            });
        }
        before.journey.powers.godmode = !before.journey.powers.godmode;
        before.journey.powers.far_placement_range = !before.journey.powers.far_placement_range;
        before.journey.powers.spawn_rate = 0.25;
        before.journey.unlocked_super_cart = !before.journey.unlocked_super_cart;
        before.journey.enabled_super_cart = !before.journey.enabled_super_cart;

        save_player(SavePlayerRequest {
            path: copy.to_string_lossy().into_owned(),
            source_hash: before.source_hash.clone(),
            character: before.character.clone(),
            effects: before.effects.clone(),
            journey: before.journey.clone(),
            spawn_points: before.spawn_points.clone(),
            inventory: before.inventory.clone(),
            equipment: before.equipment.clone(),
            storage: before.storage.clone(),
        })
        .unwrap();
        let after = load_path(&copy).unwrap();
        assert_eq!(after.effects, before.effects);
        assert_eq!(after.spawn_points, before.spawn_points);
        assert_eq!(after.journey, before.journey);
        assert_eq!(after.character, before.character);
        assert_eq!(after.inventory, before.inventory);
    }
}
