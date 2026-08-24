use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager};
use thiserror::Error;

const SCHEMA_VERSION: u32 = 1;
const CACHE_VERSION: &str = "terraria-item-metadata-v2";
const METADATA_FILE: &str = "item-metadata.json";
const METADATA_MARKER: &str = ".item-metadata-source";
const HELPER_BYTES: &[u8] = include_bytes!("../resources/PlrForge.Metadata.exe");

#[derive(Debug, Error)]
pub enum MetadataError {
    #[error("Terraria.exe could not be found beside the selected Content folder")]
    TerrariaExecutableMissing,
    #[error("Terraria's local metadata runtime is unavailable on this platform")]
    RuntimeUnavailable,
    #[error("could not prepare local item metadata: {0}")]
    Io(#[from] std::io::Error),
    #[error("Terraria's metadata helper failed: {0}")]
    Helper(String),
    #[error("Terraria returned an unsupported item metadata cache: {0}")]
    InvalidCache(String),
    #[error("could not resolve PlrForge's cache directory: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("could not parse local item metadata: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameMetadataCatalog {
    pub schema_version: u32,
    pub terraria_version: String,
    pub items: Vec<GameItemMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameItemMetadata {
    pub id: i32,
    pub key: Option<String>,
    pub name: Option<String>,
    pub tooltip: Option<String>,
    pub damage: Option<i32>,
    pub crit: Option<i32>,
    pub knock_back: Option<f32>,
    pub use_time: Option<i32>,
    pub use_animation: Option<i32>,
    pub mana: Option<i32>,
    pub defense: Option<i32>,
    pub pick: Option<i32>,
    pub axe: Option<i32>,
    pub hammer: Option<i32>,
    pub heal_life: Option<i32>,
    pub heal_mana: Option<i32>,
    pub bait: Option<i32>,
    pub fishing_pole: Option<i32>,
    pub tile_boost: Option<i32>,
    pub use_ammo: Option<i32>,
    pub ammo: Option<i32>,
    pub buff_type: Option<i32>,
    pub buff_time: Option<i32>,
    pub mount_type: Option<i32>,
    pub create_tile: Option<i32>,
    pub create_wall: Option<i32>,
    pub value: Option<i32>,
    pub rare: Option<i32>,
    pub max_stack: Option<i32>,
    pub prefix: Option<i32>,
    pub melee: Option<bool>,
    pub ranged: Option<bool>,
    pub magic: Option<bool>,
    pub summon: Option<bool>,
    pub accessory: Option<bool>,
    pub consumable: Option<bool>,
    pub material: Option<bool>,
    pub auto_reuse: Option<bool>,
    pub channel: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub struct ItemMetadataRequest {
    pub id: i32,
    pub prefix: i32,
}

pub fn prepare(images: &Path, cache_root: &Path) -> Result<GameMetadataCatalog, MetadataError> {
    let resources = terraria_resources(images).ok_or(MetadataError::TerrariaExecutableMissing)?;
    let terraria = resources.join("Terraria.exe");
    if !terraria.is_file() {
        return Err(MetadataError::TerrariaExecutableMissing);
    }

    let metadata_path = cache_root.join(METADATA_FILE);
    let marker_path = cache_root.join(METADATA_MARKER);
    let stamp = source_stamp(&terraria)?;
    if marker_path.is_file()
        && metadata_path.is_file()
        && fs::read_to_string(&marker_path).ok().as_deref() == Some(stamp.as_str())
    {
        if let Ok(catalog) = read_catalog(&metadata_path) {
            return Ok(catalog);
        }
    }

    run_helper(&resources, cache_root, &terraria, &metadata_path, None)?;
    let catalog = read_catalog(&metadata_path)?;
    fs::write(marker_path, stamp)?;
    Ok(catalog)
}

pub fn load_variants_for_app(
    app: &AppHandle,
    cache_path: &str,
    mut requests: Vec<ItemMetadataRequest>,
) -> Result<Vec<GameItemMetadata>, MetadataError> {
    let cache_root = validated_cache_path(app, cache_path)?;
    requests.retain(|request| request.id > 0 && request.prefix > 0 && request.prefix <= 255);
    requests.sort();
    requests.dedup();
    if requests.is_empty() {
        return Ok(Vec::new());
    }
    if requests.len() > 512 {
        return Err(MetadataError::InvalidCache(
            "at most 512 item-prefix requests are allowed".into(),
        ));
    }

    let stored_source =
        crate::assets::stored_source(app).ok_or(MetadataError::TerrariaExecutableMissing)?;
    let images = PathBuf::from(stored_source).canonicalize()?;
    let resources = terraria_resources(&images).ok_or(MetadataError::TerrariaExecutableMissing)?;
    let terraria = resources.join("Terraria.exe");
    let request_string = requests
        .iter()
        .map(|request| format!("{}:{}", request.id, request.prefix))
        .collect::<Vec<_>>()
        .join(",");
    let mut hash = Sha256::new();
    hash.update(CACHE_VERSION.as_bytes());
    hash.update(source_stamp(&terraria)?.as_bytes());
    hash.update(request_string.as_bytes());
    hash.update(HELPER_BYTES);
    let path = cache_root.join(format!(
        "item-variants-{}.json",
        &hex::encode(hash.finalize())[..16]
    ));

    if !path.is_file() {
        run_helper(
            &resources,
            &cache_root,
            &terraria,
            &path,
            Some(&request_string),
        )?;
    }
    Ok(read_catalog(&path)?.items)
}

pub fn load_for_app(
    app: &AppHandle,
    cache_path: &str,
) -> Result<GameMetadataCatalog, MetadataError> {
    let requested = validated_cache_path(app, cache_path)?;
    read_catalog(&requested.join(METADATA_FILE))
}

fn validated_cache_path(app: &AppHandle, cache_path: &str) -> Result<PathBuf, MetadataError> {
    let allowed_root = app.path().app_cache_dir()?.join("terraria-assets");
    let requested = PathBuf::from(cache_path);
    let allowed = allowed_root.canonicalize().unwrap_or(allowed_root);
    let requested = requested.canonicalize()?;
    if !requested.starts_with(&allowed) {
        return Err(MetadataError::InvalidCache(
            "cache path is outside PlrForge's asset cache".into(),
        ));
    }
    Ok(requested)
}

fn read_catalog(path: &Path) -> Result<GameMetadataCatalog, MetadataError> {
    let catalog: GameMetadataCatalog = serde_json::from_slice(&fs::read(path)?)?;
    if catalog.schema_version != SCHEMA_VERSION {
        return Err(MetadataError::InvalidCache(format!(
            "schema {} is not supported",
            catalog.schema_version
        )));
    }
    if catalog.items.is_empty() {
        return Err(MetadataError::InvalidCache("the item list is empty".into()));
    }
    Ok(catalog)
}

fn source_stamp(terraria: &Path) -> Result<String, std::io::Error> {
    let metadata = fs::metadata(terraria)?;
    let modified = metadata
        .modified()?
        .duration_since(UNIX_EPOCH)
        .map_err(std::io::Error::other)?
        .as_nanos();
    Ok(format!("{CACHE_VERSION}\n{}\n{modified}\n", metadata.len()))
}

fn terraria_resources(images: &Path) -> Option<PathBuf> {
    images.ancestors().find_map(|ancestor| {
        ancestor
            .join("Terraria.exe")
            .is_file()
            .then(|| ancestor.to_path_buf())
    })
}

#[cfg(target_os = "macos")]
fn run_helper(
    resources: &Path,
    cache_root: &Path,
    terraria: &Path,
    output_path: &Path,
    requests: Option<&str>,
) -> Result<(), MetadataError> {
    let contents = resources
        .parent()
        .ok_or(MetadataError::RuntimeUnavailable)?;
    let game_macos = contents.join("MacOS");
    let game_launcher = game_macos.join("Terraria.bin.osx");
    let game_libraries = game_macos.join("osx");
    if !game_launcher.is_file() || !game_libraries.is_dir() {
        return Err(MetadataError::RuntimeUnavailable);
    }

    let runtime = cache_root
        .join("metadata-runtime")
        .join("PlrForgeMetadata.app")
        .join("Contents");
    let runtime_macos = runtime.join("MacOS");
    let runtime_resources = runtime.join("Resources");
    fs::create_dir_all(&runtime_macos)?;
    fs::create_dir_all(&runtime_resources)?;
    link_or_copy(&game_launcher, &runtime_macos.join("Terraria.bin.osx"))?;
    for file in [
        "monoconfig",
        "monomachineconfig",
        "mscorlib.dll",
        "System.dll",
        "System.Core.dll",
    ] {
        link_or_copy(&resources.join(file), &runtime_resources.join(file))?;
    }
    fs::write(runtime_resources.join("Terraria.exe"), HELPER_BYTES)?;

    let mut command = Command::new(runtime_macos.join("Terraria.bin.osx"));
    command
        .current_dir(&runtime_macos)
        .env("DYLD_LIBRARY_PATH", game_libraries)
        .arg(terraria)
        .arg(output_path);
    if let Some(requests) = requests {
        command.arg(requests);
    }
    let result = command.output()?;
    helper_result(result)
}

#[cfg(target_os = "windows")]
fn run_helper(
    resources: &Path,
    cache_root: &Path,
    terraria: &Path,
    output_path: &Path,
    requests: Option<&str>,
) -> Result<(), MetadataError> {
    let helper = cache_root.join("PlrForge.Metadata.exe");
    fs::write(&helper, HELPER_BYTES)?;
    let mut command = Command::new(helper);
    command
        .current_dir(resources)
        .arg(terraria)
        .arg(output_path);
    if let Some(requests) = requests {
        command.arg(requests);
    }
    let result = command.output()?;
    helper_result(result)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn run_helper(
    _resources: &Path,
    _cache_root: &Path,
    _terraria: &Path,
    _output_path: &Path,
    _requests: Option<&str>,
) -> Result<(), MetadataError> {
    Err(MetadataError::RuntimeUnavailable)
}

fn helper_result(result: std::process::Output) -> Result<(), MetadataError> {
    if result.status.success() {
        return Ok(());
    }
    let detail = String::from_utf8_lossy(&result.stderr).trim().to_owned();
    Err(MetadataError::Helper(if detail.is_empty() {
        format!("process exited with {}", result.status)
    } else {
        detail
    }))
}

fn link_or_copy(source: &Path, target: &Path) -> Result<(), std::io::Error> {
    if target.is_file() {
        let source_metadata = fs::metadata(source)?;
        let target_metadata = fs::metadata(target)?;
        if source_metadata.len() == target_metadata.len() {
            return Ok(());
        }
        fs::remove_file(target)?;
    }
    if fs::hard_link(source, target).is_err() {
        fs::copy(source, target)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_metadata_caches() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join(METADATA_FILE);
        fs::write(
            &path,
            br#"{"schemaVersion":1,"terrariaVersion":"1.4.5.7","items":[]}"#,
        )
        .unwrap();
        assert!(matches!(
            read_catalog(&path),
            Err(MetadataError::InvalidCache(_))
        ));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn extracts_installed_terraria_metadata_when_available() {
        let Some(home) = dirs::home_dir() else { return };
        let images = home.join("Library/Application Support/Steam/steamapps/common/Terraria/Terraria.app/Contents/Resources/Content/Images");
        if !images.join("Item_2888.xnb").is_file() {
            return;
        }
        let directory = tempfile::tempdir().unwrap();
        let catalog = prepare(&images, directory.path()).unwrap();
        let bees_knees = catalog.items.iter().find(|item| item.id == 2888).unwrap();
        assert_eq!(bees_knees.damage, Some(23));
        assert_eq!(bees_knees.ranged, Some(true));
        assert!(bees_knees
            .tooltip
            .as_deref()
            .unwrap()
            .contains("column of bees"));

        let resources = terraria_resources(&images).unwrap();
        let terraria = resources.join("Terraria.exe");
        let variants_path = directory.path().join("variants.json");
        run_helper(
            &resources,
            directory.path(),
            &terraria,
            &variants_path,
            Some("2888:51"),
        )
        .unwrap();
        let variant = read_catalog(&variants_path).unwrap().items.remove(0);
        assert_eq!(variant.prefix, Some(51));
        assert_eq!(variant.damage, Some(24));
        assert_eq!(variant.crit, Some(2));
        assert_eq!(variant.use_animation, Some(21));
    }
}
