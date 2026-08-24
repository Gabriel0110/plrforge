use super::{v325, PlayerDocument, SaveError, SavePlayerRequest};
use serde::Serialize;
use std::path::Path;

const LOWEST_TERRARIA_VERSION: i32 = 1;
const LATEST_VERIFIED_VERSION: i32 = 326;
#[cfg(test)]
const VERIFIED_VERSIONS: [i32; 4] = [279, 317, 325, 326];

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CompatibilityState {
    Supported,
    Untested,
    Unsupported,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerCompatibility {
    pub state: CompatibilityState,
    pub file_version: i32,
    pub format_label: String,
    pub can_edit: bool,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Codec {
    V279,
    V317,
    V325,
    V326,
}

pub fn inspect_plaintext(data: &[u8]) -> Result<PlayerCompatibility, SaveError> {
    Ok(classify_version(read_version(data)?))
}

pub fn classify_version(version: i32) -> PlayerCompatibility {
    match version {
        279 | 317 | 325 | LATEST_VERIFIED_VERSION => PlayerCompatibility {
            state: CompatibilityState::Supported,
            file_version: version,
            format_label: if version == 279 {
                "Terraria 1.4.4.x / player v279".into()
            } else {
                format!("Terraria 1.4.5.x / player v{version}")
            },
            can_edit: true,
            message: format!(
                "Player v{version} is covered by its PlrForge codec, real-file mutation tests, and guarded save verification."
            ),
        },
        LOWEST_TERRARIA_VERSION..LATEST_VERIFIED_VERSION => PlayerCompatibility {
            state: CompatibilityState::Untested,
            file_version: version,
            format_label: format!("Historical Terraria player v{version}"),
            can_edit: false,
            message: format!(
                "Player v{version} has not passed PlrForge's golden-fixture suite. Editing remains disabled until its layout is verified."
            ),
        },
        _ if version > LATEST_VERIFIED_VERSION => PlayerCompatibility {
            state: CompatibilityState::Unsupported,
            file_version: version,
            format_label: format!("Newer Terraria player v{version}"),
            can_edit: false,
            message: format!(
                "Player v{version} is newer than PlrForge's latest verified format (v{LATEST_VERIFIED_VERSION}). Update PlrForge before editing this character."
            ),
        },
        _ => PlayerCompatibility {
            state: CompatibilityState::Unsupported,
            file_version: version,
            format_label: format!("Invalid player version {version}"),
            can_edit: false,
            message: format!(
                "Player version {version} is not a recognized Terraria desktop player format."
            ),
        },
    }
}

pub(super) fn codec_for_plaintext(data: &[u8]) -> Result<Codec, SaveError> {
    let version = read_version(data)?;
    match version {
        279 => Ok(Codec::V279),
        317 => Ok(Codec::V317),
        325 => Ok(Codec::V325),
        LATEST_VERIFIED_VERSION => Ok(Codec::V326),
        _ => Err(SaveError::UnsupportedVersion(version)),
    }
}

pub(super) fn parse_document(
    path: &Path,
    source_hash: &str,
    data: &[u8],
) -> Result<PlayerDocument, SaveError> {
    codec_for_plaintext(data)?.parse(path, source_hash, data)
}

impl Codec {
    pub(super) fn parse(
        self,
        path: &Path,
        source_hash: &str,
        data: &[u8],
    ) -> Result<PlayerDocument, SaveError> {
        match self {
            Self::V279 => v325::parse_v279(path, source_hash, data),
            Self::V317 => v325::parse_v317(path, source_hash, data),
            Self::V325 => v325::parse(path, source_hash, data),
            Self::V326 => v325::parse_v326(path, source_hash, data),
        }
    }

    pub(super) fn validate(self, request: &SavePlayerRequest) -> Result<(), SaveError> {
        match self {
            Self::V279 => v325::validate_document_v279(
                &request.character,
                &request.effects,
                &request.journey,
                &request.spawn_points,
                &request.inventory,
                &request.equipment,
                &request.storage,
            ),
            Self::V317 => v325::validate_document_v317(
                &request.character,
                &request.effects,
                &request.journey,
                &request.spawn_points,
                &request.inventory,
                &request.equipment,
                &request.storage,
            ),
            Self::V325 => v325::validate_document(
                &request.character,
                &request.effects,
                &request.journey,
                &request.spawn_points,
                &request.inventory,
                &request.equipment,
                &request.storage,
            ),
            Self::V326 => v325::validate_document_v326(
                &request.character,
                &request.effects,
                &request.journey,
                &request.spawn_points,
                &request.inventory,
                &request.equipment,
                &request.storage,
            ),
        }
    }

    pub(super) fn patch(
        self,
        data: &[u8],
        request: &SavePlayerRequest,
    ) -> Result<Vec<u8>, SaveError> {
        match self {
            Self::V279 => v325::patch_document_v279(
                data,
                v325::PatchDocument {
                    character: &request.character,
                    effects: &request.effects,
                    journey: &request.journey,
                    spawn_points: &request.spawn_points,
                    inventory: &request.inventory,
                    equipment: &request.equipment,
                    storage: &request.storage,
                },
            ),
            Self::V317 => v325::patch_document_v317(
                data,
                v325::PatchDocument {
                    character: &request.character,
                    effects: &request.effects,
                    journey: &request.journey,
                    spawn_points: &request.spawn_points,
                    inventory: &request.inventory,
                    equipment: &request.equipment,
                    storage: &request.storage,
                },
            ),
            Self::V325 => v325::patch_document(
                data,
                v325::PatchDocument {
                    character: &request.character,
                    effects: &request.effects,
                    journey: &request.journey,
                    spawn_points: &request.spawn_points,
                    inventory: &request.inventory,
                    equipment: &request.equipment,
                    storage: &request.storage,
                },
            ),
            Self::V326 => v325::patch_document_v326(
                data,
                v325::PatchDocument {
                    character: &request.character,
                    effects: &request.effects,
                    journey: &request.journey,
                    spawn_points: &request.spawn_points,
                    inventory: &request.inventory,
                    equipment: &request.equipment,
                    storage: &request.storage,
                },
            ),
        }
    }
}

fn read_version(data: &[u8]) -> Result<i32, SaveError> {
    let bytes: [u8; 4] = data
        .get(..4)
        .ok_or(SaveError::Truncated)?
        .try_into()
        .map_err(|_| SaveError::Truncated)?;
    Ok(i32::from_le_bytes(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_verified_historical_and_newer_formats() {
        for version in VERIFIED_VERSIONS {
            let supported = classify_version(version);
            assert_eq!(supported.state, CompatibilityState::Supported);
            assert!(supported.can_edit);
        }

        let historical = classify_version(278);
        assert_eq!(historical.state, CompatibilityState::Untested);
        assert!(!historical.can_edit);
        assert!(historical.message.contains("golden-fixture"));

        let newer = classify_version(327);
        assert_eq!(newer.state, CompatibilityState::Unsupported);
        assert!(!newer.can_edit);
        assert!(newer.message.contains("Update PlrForge"));
    }

    #[test]
    fn refuses_to_select_a_codec_for_unverified_versions() {
        assert_eq!(
            codec_for_plaintext(&279i32.to_le_bytes()).unwrap(),
            Codec::V279
        );
        assert_eq!(
            codec_for_plaintext(&317i32.to_le_bytes()).unwrap(),
            Codec::V317
        );
        assert_eq!(
            codec_for_plaintext(&325i32.to_le_bytes()).unwrap(),
            Codec::V325
        );
        assert_eq!(
            codec_for_plaintext(&326i32.to_le_bytes()).unwrap(),
            Codec::V326
        );
        assert!(matches!(
            codec_for_plaintext(&316i32.to_le_bytes()),
            Err(SaveError::UnsupportedVersion(316))
        ));
        assert!(matches!(
            codec_for_plaintext(&327i32.to_le_bytes()),
            Err(SaveError::UnsupportedVersion(327))
        ));
    }

    #[test]
    fn rejects_truncated_version_headers() {
        assert!(matches!(
            inspect_plaintext(&[1, 2, 3]),
            Err(SaveError::Truncated)
        ));
    }
}
