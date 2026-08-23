use lzxd::{Lzxd, WindowSize};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs,
    io::BufWriter,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager};
use thiserror::Error;

const CACHE_VERSION: &str = "xnb-textures-v2";
const COMPLETE_MARKER: &str = ".complete";

#[derive(Debug, Error)]
pub enum AssetError {
    #[error("Terraria's Content/Images folder could not be found. Choose the Terraria application or installation folder.")]
    SourceNotFound,
    #[error("the selected folder does not contain Terraria item textures")]
    InvalidSource,
    #[error("could not read or write game icon cache: {0}")]
    Io(#[from] std::io::Error),
    #[error("invalid XNB texture: {0}")]
    InvalidXnb(String),
    #[error("could not decode XNB texture: {0}")]
    Decode(String),
    #[error("could not encode PNG texture: {0}")]
    Png(#[from] png::EncodingError),
    #[error("could not resolve the application cache: {0}")]
    Tauri(#[from] tauri::Error),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameAssetStatus {
    pub state: String,
    pub source_path: Option<String>,
    pub cache_path: Option<String>,
    pub item_count: usize,
    pub buff_count: usize,
    pub message: String,
}

#[derive(Debug, PartialEq)]
struct Texture {
    width: u32,
    height: u32,
    rgba: Vec<u8>,
}

pub fn prepare(
    app: &AppHandle,
    selected_path: Option<&str>,
) -> Result<GameAssetStatus, AssetError> {
    let source = discover_images_dir(selected_path).ok_or(if selected_path.is_some() {
        AssetError::InvalidSource
    } else {
        AssetError::SourceNotFound
    })?;
    let assets = source_assets(&source)?;
    let item_count = assets
        .iter()
        .filter(|path| asset_kind(path) == Some("Item"))
        .count();
    let buff_count = assets.len() - item_count;
    let fingerprint = source_fingerprint(&source, &assets)?;
    let cache_root = app
        .path()
        .app_cache_dir()?
        .join("terraria-assets")
        .join(fingerprint);
    let marker = cache_root.join(COMPLETE_MARKER);

    let cache_complete = marker.is_file()
        && assets
            .iter()
            .all(|path| cache_target(&cache_root, path).is_some_and(|target| target.is_file()));
    if !cache_complete {
        fs::create_dir_all(cache_root.join("items"))?;
        fs::create_dir_all(cache_root.join("buffs"))?;
        for path in &assets {
            let target = cache_target(&cache_root, path).ok_or_else(|| {
                AssetError::InvalidXnb(format!("invalid asset filename: {}", path.display()))
            })?;
            if !target.is_file() {
                extract_texture(path, &target)?;
            }
        }
        fs::write(
            &marker,
            format!("{CACHE_VERSION}\nitems={item_count}\nbuffs={buff_count}\n"),
        )?;
    }

    persist_source(app, &source)?;
    Ok(GameAssetStatus {
        state: "ready".into(),
        source_path: Some(source.to_string_lossy().into_owned()),
        cache_path: Some(cache_root.to_string_lossy().into_owned()),
        item_count,
        buff_count,
        message: format!("{item_count} item icons and {buff_count} buff icons are ready."),
    })
}

fn cache_target(cache_root: &Path, source: &Path) -> Option<PathBuf> {
    let target_dir = if asset_kind(source)? == "Item" {
        "items"
    } else {
        "buffs"
    };
    let stem = source.file_stem()?.to_str()?;
    Some(cache_root.join(target_dir).join(format!("{stem}.png")))
}

pub fn missing_status(error: &AssetError) -> GameAssetStatus {
    GameAssetStatus {
        state: "missing".into(),
        source_path: None,
        cache_path: None,
        item_count: 0,
        buff_count: 0,
        message: error.to_string(),
    }
}

fn persist_source(app: &AppHandle, source: &Path) -> Result<(), AssetError> {
    let config = app.path().app_config_dir()?;
    fs::create_dir_all(&config)?;
    fs::write(
        config.join("asset-source.txt"),
        source.to_string_lossy().as_bytes(),
    )?;
    Ok(())
}

pub fn stored_source(app: &AppHandle) -> Option<String> {
    let path = app.path().app_config_dir().ok()?.join("asset-source.txt");
    fs::read_to_string(path)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn discover_images_dir(selected_path: Option<&str>) -> Option<PathBuf> {
    let mut roots = Vec::new();
    if let Some(path) = selected_path {
        roots.push(PathBuf::from(path));
    } else {
        if let Some(home) = dirs::home_dir() {
            roots.extend([
                home.join("Library/Application Support/Steam/steamapps/common/Terraria"),
                home.join(".local/share/Steam/steamapps/common/Terraria"),
                home.join(".steam/steam/steamapps/common/Terraria"),
                home.join("GOG Games/Terraria"),
            ]);
        }
        roots.extend([
            PathBuf::from("/Applications/Terraria.app"),
            PathBuf::from(r"C:\Program Files (x86)\Steam\steamapps\common\Terraria"),
            PathBuf::from(r"C:\Program Files\Steam\steamapps\common\Terraria"),
            PathBuf::from(r"C:\GOG Games\Terraria"),
            PathBuf::from(r"C:\Program Files (x86)\GOG Galaxy\Games\Terraria"),
            PathBuf::from(r"C:\Program Files\GOG Galaxy\Games\Terraria"),
        ]);
        roots.extend(steam_library_roots());
    }

    let mut seen = BTreeSet::new();
    roots
        .into_iter()
        .flat_map(image_candidates)
        .find_map(|candidate| {
            let key = candidate.to_string_lossy().into_owned();
            if seen.insert(key) && is_images_dir(&candidate) {
                candidate.canonicalize().ok().or(Some(candidate))
            } else {
                None
            }
        })
}

fn image_candidates(root: PathBuf) -> Vec<PathBuf> {
    vec![
        root.clone(),
        root.join("Images"),
        root.join("Content/Images"),
        root.join("Resources/Content/Images"),
        root.join("Contents/Resources/Content/Images"),
        root.join("Terraria.app/Contents/Resources/Content/Images"),
        root.join("steamapps/common/Terraria/Content/Images"),
        root.join("steamapps/common/Terraria/Terraria.app/Contents/Resources/Content/Images"),
    ]
}

fn is_images_dir(path: &Path) -> bool {
    path.join("Item_1.xnb").is_file()
        || fs::read_dir(path).ok().is_some_and(|entries| {
            entries.flatten().take(64).any(|entry| {
                entry
                    .file_name()
                    .to_str()
                    .is_some_and(|name| name.starts_with("Item_") && name.ends_with(".xnb"))
            })
        })
}

fn steam_library_roots() -> Vec<PathBuf> {
    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };
    let files = [
        home.join("Library/Application Support/Steam/steamapps/libraryfolders.vdf"),
        home.join(".local/share/Steam/steamapps/libraryfolders.vdf"),
        home.join(".steam/steam/steamapps/libraryfolders.vdf"),
        PathBuf::from(r"C:\Program Files (x86)\Steam\steamapps\libraryfolders.vdf"),
        PathBuf::from(r"C:\Program Files\Steam\steamapps\libraryfolders.vdf"),
    ];
    files
        .into_iter()
        .filter_map(|path| fs::read_to_string(path).ok())
        .flat_map(|text| {
            text.lines()
                .filter_map(|line| {
                    let quoted = line.split('"').collect::<Vec<_>>();
                    (quoted.len() >= 4 && quoted[1].trim() == "path")
                        .then(|| PathBuf::from(quoted[3].replace("\\\\", "\\")))
                })
                .collect::<Vec<_>>()
        })
        .collect()
}

fn source_assets(source: &Path) -> Result<Vec<PathBuf>, AssetError> {
    let mut assets = fs::read_dir(source)?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| asset_kind(path).is_some())
        .collect::<Vec<_>>();
    assets.sort();
    if !assets.iter().any(|path| asset_kind(path) == Some("Item")) {
        return Err(AssetError::InvalidSource);
    }
    Ok(assets)
}

fn asset_kind(path: &Path) -> Option<&'static str> {
    let name = path.file_name()?.to_str()?;
    if !name.ends_with(".xnb") {
        return None;
    }
    if numeric_asset_name(name, "Item_") {
        Some("Item")
    } else if numeric_asset_name(name, "Buff_") {
        Some("Buff")
    } else {
        None
    }
}

fn numeric_asset_name(name: &str, prefix: &str) -> bool {
    name.strip_prefix(prefix)
        .and_then(|rest| rest.strip_suffix(".xnb"))
        .is_some_and(|id| !id.is_empty() && id.bytes().all(|byte| byte.is_ascii_digit()))
}

fn source_fingerprint(source: &Path, assets: &[PathBuf]) -> Result<String, AssetError> {
    let mut hash = Sha256::new();
    hash.update(CACHE_VERSION.as_bytes());
    hash.update(source.to_string_lossy().as_bytes());
    for path in assets {
        let metadata = fs::metadata(path)?;
        hash.update(
            path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .as_bytes(),
        );
        hash.update(metadata.len().to_le_bytes());
        if let Ok(modified) = metadata.modified().and_then(|value| {
            value
                .duration_since(UNIX_EPOCH)
                .map_err(std::io::Error::other)
        }) {
            hash.update(modified.as_nanos().to_le_bytes());
        }
    }
    Ok(hex::encode(hash.finalize())[..16].to_owned())
}

fn extract_texture(source: &Path, target: &Path) -> Result<(), AssetError> {
    let mut texture = decode_texture_xnb(&fs::read(source)?)?;
    if asset_kind(source) == Some("Item") {
        if let Some(id) = asset_id(source) {
            texture = first_item_frame(texture, item_frame_count(id))?;
        }
    }
    let temporary = target.with_extension("png.tmp");
    let file = fs::File::create(&temporary)?;
    let mut encoder = png::Encoder::new(BufWriter::new(file), texture.width, texture.height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.write_header()?.write_image_data(&texture.rgba)?;
    fs::rename(temporary, target)?;
    Ok(())
}

fn asset_id(path: &Path) -> Option<u32> {
    path.file_stem()?.to_str()?.split_once('_')?.1.parse().ok()
}

// Terraria v325 registers these textures as vertical item animations. Food membership mirrors
// ItemID.Sets.IsFood from the installed assembly; all registered foods use three frames.
fn item_frame_count(id: u32) -> u32 {
    match id {
        75 => 8,
        5644 => 9,
        3581 | 3580 | 575 | 547 | 520 | 548 | 521 | 549 | 3453 | 3454 | 3455 | 4068 | 4069
        | 4070 => 4,
        353 | 357 | 1787 | 1911 | 1912 | 1919 | 1920 | 2266 | 2267 | 2268 | 2425 | 2426 | 2427
        | 3195 | 3532 | 4009 | 4010 | 4011 | 4012 | 4013 | 4014 | 4015 | 4016 | 4017 | 4018
        | 4019 | 4020 | 4021 | 4022 | 4023 | 4024 | 4025 | 4026 | 4027 | 4028 | 4029 | 4030
        | 4031 | 4032 | 4033 | 4034 | 4035 | 4036 | 4037 | 967 | 969 | 4282 | 4283 | 4284
        | 4285 | 4286 | 4287 | 4288 | 4289 | 4290 | 4291 | 4292 | 4293 | 4294 | 4295 | 4296
        | 4297 | 4403 | 4411 | 4614 | 4615 | 4616 | 4617 | 4618 | 4619 | 4620 | 4621 | 4622
        | 4623 | 4624 | 4625 | 5009 | 5042 | 5041 | 5092 | 5093 | 5275 | 5277 | 5278 | 5537
        | 5645 => 3,
        _ => 1,
    }
}

fn first_item_frame(texture: Texture, frame_count: u32) -> Result<Texture, AssetError> {
    if frame_count <= 1 {
        return Ok(texture);
    }
    if !texture.height.is_multiple_of(frame_count) {
        return Err(AssetError::InvalidXnb(format!(
            "animated texture height {} is not divisible by {frame_count}",
            texture.height
        )));
    }
    let frame_height = texture.height / frame_count;
    let byte_count = texture.width as usize * frame_height as usize * 4;
    Ok(Texture {
        width: texture.width,
        height: frame_height,
        rgba: texture.rgba[..byte_count].to_vec(),
    })
}

fn decode_texture_xnb(bytes: &[u8]) -> Result<Texture, AssetError> {
    if bytes.len() < 10 || &bytes[..3] != b"XNB" {
        return Err(AssetError::InvalidXnb("missing XNB header".into()));
    }
    if bytes[4] != 5 {
        return Err(AssetError::InvalidXnb(format!(
            "unsupported XNB version {}",
            bytes[4]
        )));
    }
    let compressed = bytes[5] & 0x80 != 0;
    let declared_size = u32::from_le_bytes(bytes[6..10].try_into().unwrap()) as usize;
    if declared_size != bytes.len() {
        return Err(AssetError::InvalidXnb(format!(
            "declared file size {declared_size} does not match {}",
            bytes.len()
        )));
    }
    let payload = if compressed {
        if bytes.len() < 14 {
            return Err(AssetError::InvalidXnb(
                "compressed XNB header is truncated".into(),
            ));
        }
        let output_size = u32::from_le_bytes(bytes[10..14].try_into().unwrap()) as usize;
        decompress_lzx_frames(&bytes[14..], output_size)?
    } else {
        bytes[10..].to_vec()
    };
    parse_texture_payload(&payload)
}

fn decompress_lzx_frames(input: &[u8], expected_size: usize) -> Result<Vec<u8>, AssetError> {
    let mut decoder = Lzxd::new(WindowSize::KB64);
    let mut output = Vec::with_capacity(expected_size);
    let mut offset = 0usize;
    while offset < input.len() && output.len() < expected_size {
        if input.len() - offset < 2 {
            return Err(AssetError::Decode("truncated LZX frame header".into()));
        }
        let first = input[offset];
        let second = input[offset + 1];
        let (frame_size, block_size, header_size) = if first == 0xff {
            if input.len() - offset < 5 {
                return Err(AssetError::Decode(
                    "truncated extended LZX frame header".into(),
                ));
            }
            (
                u16::from_be_bytes([second, input[offset + 2]]) as usize,
                u16::from_be_bytes([input[offset + 3], input[offset + 4]]) as usize,
                5,
            )
        } else {
            (0x8000, u16::from_be_bytes([first, second]) as usize, 2)
        };
        offset += header_size;
        if block_size == 0 || frame_size == 0 {
            break;
        }
        let end = offset
            .checked_add(block_size)
            .ok_or_else(|| AssetError::Decode("LZX block size overflow".into()))?;
        if end > input.len() {
            return Err(AssetError::Decode("LZX frame exceeds input".into()));
        }
        let remaining = expected_size - output.len();
        let frame_output = frame_size.min(remaining);
        let decoded = decoder
            .decompress_next(&input[offset..end], frame_output)
            .map_err(|error| AssetError::Decode(error.to_string()))?;
        output.extend_from_slice(decoded);
        offset = end;
    }
    if output.len() != expected_size {
        return Err(AssetError::Decode(format!(
            "decoded {} bytes, expected {expected_size}",
            output.len()
        )));
    }
    Ok(output)
}

fn parse_texture_payload(payload: &[u8]) -> Result<Texture, AssetError> {
    let mut reader = Reader::new(payload);
    let reader_count = reader.read_7bit()?;
    if reader_count == 0 {
        return Err(AssetError::InvalidXnb("texture has no type reader".into()));
    }
    let mut primary_reader = reader.read_string()?;
    reader.read_u32()?;
    for _ in 1..reader_count {
        reader.read_string()?;
        reader.read_u32()?;
    }
    if reader.read_7bit()? != 0 {
        return Err(AssetError::InvalidXnb(
            "shared resources are unsupported".into(),
        ));
    }
    if reader.read_7bit()? != 1 {
        return Err(AssetError::InvalidXnb(
            "primary texture asset is null".into(),
        ));
    }
    if let Some(index) = primary_reader.find(',') {
        primary_reader.truncate(index);
    }
    if primary_reader != "Microsoft.Xna.Framework.Content.Texture2DReader" {
        return Err(AssetError::InvalidXnb(format!(
            "unsupported reader {primary_reader}"
        )));
    }
    let surface_format = reader.read_u32()?;
    let width = reader.read_u32()?;
    let height = reader.read_u32()?;
    let mip_count = reader.read_u32()?;
    let size = reader.read_u32()? as usize;
    if surface_format != 0 || mip_count != 1 || width == 0 || height == 0 {
        return Err(AssetError::InvalidXnb(format!("unsupported texture format={surface_format}, mipCount={mip_count}, size={width}x{height}")));
    }
    let expected = (width as usize)
        .checked_mul(height as usize)
        .and_then(|value| value.checked_mul(4))
        .ok_or_else(|| AssetError::InvalidXnb("texture dimensions overflow".into()))?;
    if size != expected {
        return Err(AssetError::InvalidXnb(format!(
            "RGBA length {size} does not match {width}x{height}"
        )));
    }
    Ok(Texture {
        width,
        height,
        rgba: reader.read_bytes(size)?.to_vec(),
    })
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }
    fn read_bytes(&mut self, length: usize) -> Result<&'a [u8], AssetError> {
        let end = self
            .offset
            .checked_add(length)
            .ok_or_else(|| AssetError::InvalidXnb("payload offset overflow".into()))?;
        let value = self
            .bytes
            .get(self.offset..end)
            .ok_or_else(|| AssetError::InvalidXnb("payload is truncated".into()))?;
        self.offset = end;
        Ok(value)
    }
    fn read_u32(&mut self) -> Result<u32, AssetError> {
        Ok(u32::from_le_bytes(self.read_bytes(4)?.try_into().unwrap()))
    }
    fn read_7bit(&mut self) -> Result<usize, AssetError> {
        let mut result = 0usize;
        for shift in (0..35).step_by(7) {
            let byte = self.read_bytes(1)?[0];
            result |= ((byte & 0x7f) as usize) << shift;
            if byte & 0x80 == 0 {
                return Ok(result);
            }
        }
        Err(AssetError::InvalidXnb("invalid 7-bit integer".into()))
    }
    fn read_string(&mut self) -> Result<String, AssetError> {
        let length = self.read_7bit()?;
        String::from_utf8(self.read_bytes(length)?.to_vec())
            .map_err(|_| AssetError::InvalidXnb("type reader name is not UTF-8".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn push_7bit(output: &mut Vec<u8>, mut value: usize) {
        loop {
            let mut byte = (value & 0x7f) as u8;
            value >>= 7;
            if value != 0 {
                byte |= 0x80;
            }
            output.push(byte);
            if value == 0 {
                break;
            }
        }
    }

    #[test]
    fn decodes_an_uncompressed_color_texture() {
        let mut payload = Vec::new();
        push_7bit(&mut payload, 1);
        let reader = b"Microsoft.Xna.Framework.Content.Texture2DReader";
        push_7bit(&mut payload, reader.len());
        payload.extend_from_slice(reader);
        payload.extend_from_slice(&0u32.to_le_bytes());
        push_7bit(&mut payload, 0);
        push_7bit(&mut payload, 1);
        payload.extend_from_slice(&0u32.to_le_bytes());
        payload.extend_from_slice(&1u32.to_le_bytes());
        payload.extend_from_slice(&1u32.to_le_bytes());
        payload.extend_from_slice(&1u32.to_le_bytes());
        payload.extend_from_slice(&4u32.to_le_bytes());
        payload.extend_from_slice(&[10, 20, 30, 40]);

        let mut xnb = b"XNBw\x05\x00".to_vec();
        xnb.extend_from_slice(&((payload.len() + 10) as u32).to_le_bytes());
        xnb.extend_from_slice(&payload);
        assert_eq!(
            decode_texture_xnb(&xnb).unwrap(),
            Texture {
                width: 1,
                height: 1,
                rgba: vec![10, 20, 30, 40]
            }
        );
    }

    #[test]
    fn decodes_installed_terraria_icons_when_available() {
        let Some(images) = discover_images_dir(None) else {
            return;
        };
        for id in [2768, 3043] {
            let texture =
                decode_texture_xnb(&fs::read(images.join(format!("Item_{id}.xnb"))).unwrap())
                    .unwrap();
            assert!(texture.width > 0 && texture.height > 0);
            assert_eq!(
                texture.rgba.len(),
                texture.width as usize * texture.height as usize * 4
            );
        }

        let star = decode_texture_xnb(&fs::read(images.join("Item_75.xnb")).unwrap()).unwrap();
        let first_frame = first_item_frame(star, item_frame_count(75)).unwrap();
        assert_eq!((first_frame.width, first_frame.height), (22, 26));
    }

    #[test]
    fn crops_only_the_first_vertical_animation_frame() {
        let texture = Texture {
            width: 1,
            height: 3,
            rgba: vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        };
        assert_eq!(
            first_item_frame(texture, 3).unwrap(),
            Texture {
                width: 1,
                height: 1,
                rgba: vec![1, 2, 3, 4]
            }
        );
    }

    #[test]
    fn parses_modern_steam_library_paths() {
        let line = r#"        "path"        "D:\\SteamLibrary""#;
        let quoted = line.split('"').collect::<Vec<_>>();
        assert_eq!(quoted[1], "path");
        assert_eq!(quoted[3].replace("\\\\", "\\"), r"D:\SteamLibrary");
    }
}
