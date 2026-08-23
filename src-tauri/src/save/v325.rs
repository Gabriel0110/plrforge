use super::SaveError;
use serde::{Deserialize, Serialize};
use std::path::Path;

const VERSION: i32 = 325;
const METADATA_END: usize = 24;
const HEADER_AFTER_NAME: usize = 80;
const ARMOR_RECORDS: usize = 20;
const DYE_RECORDS: usize = 10;
const MISC_RECORDS: usize = 5;
const INVENTORY_RECORDS: usize = 58;
const BANK_RECORDS: usize = 40;
const LOADOUT_RECORDS: usize = 3;
const EQUIPMENT_RECORD_SIZE: usize = 6;
const COMPACT_ITEM_SIZE: usize = 5;
const INVENTORY_RECORD_SIZE: usize = 10;
const BANK_RECORD_SIZE: usize = 9;
const LOADOUT_SIZE: usize = 310;
const BUFF_RECORDS: usize = 44;
const BUFF_RECORD_SIZE: usize = 8;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerDocument {
    pub path: String,
    pub source_hash: String,
    pub version: i32,
    pub character: CharacterDocument,
    pub effects: EffectsDocument,
    pub journey: JourneyDocument,
    pub spawn_points: Vec<SpawnPoint>,
    pub inventory: Vec<ItemSlot>,
    pub equipment: EquipmentDocument,
    pub storage: StorageDocument,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CharacterDocument {
    pub name: String,
    pub difficulty: u8,
    pub play_time_ticks: String,
    pub stats: CharacterStats,
    pub appearance: CharacterAppearance,
    pub upgrades: PermanentUpgrades,
    pub counters: CharacterCounters,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CharacterStats {
    pub life: i32,
    pub life_max: i32,
    pub mana: i32,
    pub mana_max: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CharacterAppearance {
    pub hair: i32,
    pub hair_dye: u8,
    pub team: u8,
    pub skin_variant: u8,
    pub hair_color: RgbColor,
    pub skin_color: RgbColor,
    pub eye_color: RgbColor,
    pub shirt_color: RgbColor,
    pub under_shirt_color: RgbColor,
    pub pants_color: RgbColor,
    pub shoe_color: RgbColor,
    pub voice_variant: u8,
    pub voice_pitch: f32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PermanentUpgrades {
    pub extra_accessory: bool,
    pub unlocked_biome_torches: bool,
    pub using_biome_torches: bool,
    pub ate_artisan_bread: bool,
    pub used_aegis_crystal: bool,
    pub used_aegis_fruit: bool,
    pub used_arcane_crystal: bool,
    pub used_galaxy_pearl: bool,
    pub used_gummy_worm: bool,
    pub used_ambrosia: bool,
    pub downed_dd2_event: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CharacterCounters {
    pub tax_money: i32,
    pub pve_deaths: i32,
    pub pvp_deaths: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EffectsDocument {
    pub buffs: Vec<BuffSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BuffSlot {
    pub slot: u8,
    pub buff_id: i32,
    pub time: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SpawnPoint {
    pub x: i32,
    pub y: i32,
    pub world_id: i32,
    pub world_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JourneyDocument {
    pub research: Vec<ResearchEntry>,
    pub powers: JourneyPowers,
    pub serialized_power_ids: Vec<u16>,
    pub unlocked_super_cart: bool,
    pub enabled_super_cart: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResearchEntry {
    pub persistent_id: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct JourneyPowers {
    pub godmode: bool,
    pub far_placement_range: bool,
    pub spawn_rate: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ItemSlot {
    pub slot: u8,
    pub item_id: i32,
    pub stack: i32,
    pub prefix: u8,
    pub favorited: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentLoadout {
    pub armor: Vec<ItemSlot>,
    pub dyes: Vec<ItemSlot>,
    pub hidden: Vec<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentDocument {
    pub current_loadout_index: u8,
    pub loadouts: Vec<EquipmentLoadout>,
    pub misc_equips: Vec<ItemSlot>,
    pub misc_dyes: Vec<ItemSlot>,
    pub misc_hidden: Vec<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StorageDocument {
    pub piggy_bank: Vec<ItemSlot>,
    pub safe: Vec<ItemSlot>,
    pub defenders_forge: Vec<ItemSlot>,
    pub void_vault: Vec<ItemSlot>,
}

#[derive(Debug, Clone, Copy)]
struct Layout {
    name_end: usize,
    armor: usize,
    dyes: usize,
    inventory: usize,
    misc: usize,
    banks: [usize; 4],
    buffs: usize,
    spawn_points: usize,
    spawn_points_end: usize,
    research: usize,
    research_end: usize,
    powers: usize,
    powers_end: usize,
    super_cart: usize,
    current_loadout_index: usize,
    loadouts: usize,
    voice_variant: usize,
    voice_pitch: usize,
}

pub fn parse(path: &Path, source_hash: &str, data: &[u8]) -> Result<PlayerDocument, SaveError> {
    let version = read_i32(data, 0)?;
    if version != VERSION {
        return Err(SaveError::UnsupportedVersion(version));
    }
    let (name, name_end) = read_dotnet_string(data, METADATA_END)?;
    let layout = locate_layout(data)?;
    let mut cursor = name_end;
    let difficulty = read_u8(data, cursor)?;
    cursor += 1;
    let play_time_ticks = read_i64(data, cursor)?;
    cursor += 8;
    let hair = read_i32(data, cursor)?;
    let hair_dye = read_u8(data, cursor + 4)?;
    let team = read_u8(data, cursor + 5)?;
    let skin_variant = read_u8(data, cursor + 9)?;
    cursor += 10;
    let life = read_i32(data, cursor)?;
    cursor += 4;
    let life_max = read_i32(data, cursor)?;
    cursor += 4;
    let mana = read_i32(data, cursor)?;
    cursor += 4;
    let mana_max = read_i32(data, cursor)?;

    let header = name_end;
    let colors = header + 59;
    let appearance = CharacterAppearance {
        hair,
        hair_dye,
        team,
        skin_variant,
        hair_color: read_color(data, colors)?,
        skin_color: read_color(data, colors + 3)?,
        eye_color: read_color(data, colors + 6)?,
        shirt_color: read_color(data, colors + 9)?,
        under_shirt_color: read_color(data, colors + 12)?,
        pants_color: read_color(data, colors + 15)?,
        shoe_color: read_color(data, colors + 18)?,
        voice_variant: read_u8(data, layout.voice_variant)?,
        voice_pitch: read_f32(data, layout.voice_pitch)?,
    };

    let inventory = read_slots(
        data,
        layout.inventory,
        INVENTORY_RECORDS,
        INVENTORY_RECORD_SIZE,
        true,
    )?;
    let current_loadout_index = read_i32(data, layout.current_loadout_index)?;
    if !(0..LOADOUT_RECORDS as i32).contains(&current_loadout_index) {
        return Err(SaveError::Validation(format!(
            "current loadout index {current_loadout_index} is outside the supported range"
        )));
    }
    let current_loadout_index = current_loadout_index as usize;
    let mut loadouts = (0..LOADOUT_RECORDS)
        .map(|index| read_serialized_loadout(data, layout.loadouts + index * LOADOUT_SIZE))
        .collect::<Result<Vec<_>, _>>()?;
    loadouts[current_loadout_index] = read_active_loadout(data, layout)?;

    let misc_equips = (0..MISC_RECORDS)
        .map(|slot| read_compact_item(data, layout.misc + slot * COMPACT_ITEM_SIZE * 2, slot))
        .collect::<Result<Vec<_>, _>>()?;
    let misc_dyes = (0..MISC_RECORDS)
        .map(|slot| {
            read_compact_item(
                data,
                layout.misc + slot * COMPACT_ITEM_SIZE * 2 + COMPACT_ITEM_SIZE,
                slot,
            )
        })
        .collect::<Result<Vec<_>, _>>()?;
    let misc_flags = read_u8(data, layout.name_end + 17)?;
    let misc_hidden = (0..MISC_RECORDS)
        .map(|index| misc_flags & (1 << index) != 0)
        .collect();
    let super_cart = read_u8(data, layout.super_cart)?;
    let (journey_powers, serialized_power_ids) = read_journey_powers(data, layout.powers)?;

    Ok(PlayerDocument {
        path: path.to_string_lossy().into_owned(),
        source_hash: source_hash.into(),
        version,
        character: CharacterDocument {
            name,
            difficulty,
            play_time_ticks: play_time_ticks.to_string(),
            stats: CharacterStats {
                life,
                life_max,
                mana,
                mana_max,
            },
            appearance,
            upgrades: PermanentUpgrades {
                extra_accessory: read_bool(data, header + 35)?,
                unlocked_biome_torches: read_bool(data, header + 36)?,
                using_biome_torches: read_bool(data, header + 37)?,
                ate_artisan_bread: read_bool(data, header + 38)?,
                used_aegis_crystal: read_bool(data, header + 40)?,
                used_aegis_fruit: read_bool(data, header + 41)?,
                used_arcane_crystal: read_bool(data, header + 42)?,
                used_galaxy_pearl: read_bool(data, header + 43)?,
                used_gummy_worm: read_bool(data, header + 44)?,
                used_ambrosia: read_bool(data, header + 45)?,
                downed_dd2_event: read_bool(data, header + 46)?,
            },
            counters: CharacterCounters {
                tax_money: read_i32(data, header + 47)?,
                pve_deaths: read_i32(data, header + 51)?,
                pvp_deaths: read_i32(data, header + 55)?,
            },
        },
        effects: read_effects(data, layout.buffs)?,
        journey: JourneyDocument {
            research: read_research(data, layout.research)?,
            powers: journey_powers,
            serialized_power_ids,
            unlocked_super_cart: super_cart & 1 != 0,
            enabled_super_cart: super_cart & 2 != 0,
        },
        spawn_points: read_spawn_points(data, layout.spawn_points)?,
        inventory,
        equipment: EquipmentDocument {
            current_loadout_index: current_loadout_index as u8,
            loadouts,
            misc_equips,
            misc_dyes,
            misc_hidden,
        },
        storage: StorageDocument {
            piggy_bank: read_slots(data, layout.banks[0], BANK_RECORDS, BANK_RECORD_SIZE, false)?,
            safe: read_slots(data, layout.banks[1], BANK_RECORDS, BANK_RECORD_SIZE, false)?,
            defenders_forge: read_slots(
                data,
                layout.banks[2],
                BANK_RECORDS,
                BANK_RECORD_SIZE,
                false,
            )?,
            void_vault: read_slots(
                data,
                layout.banks[3],
                BANK_RECORDS,
                INVENTORY_RECORD_SIZE,
                true,
            )?,
        },
    })
}

fn read_effects(data: &[u8], base: usize) -> Result<EffectsDocument, SaveError> {
    let buffs = (0..BUFF_RECORDS)
        .map(|slot| {
            let offset = base + slot * BUFF_RECORD_SIZE;
            Ok(BuffSlot {
                slot: slot as u8,
                buff_id: read_i32(data, offset)?,
                time: read_i32(data, offset + 4)?,
            })
        })
        .collect::<Result<Vec<_>, SaveError>>()?;
    Ok(EffectsDocument { buffs })
}

fn read_spawn_points(data: &[u8], mut cursor: usize) -> Result<Vec<SpawnPoint>, SaveError> {
    let mut points = Vec::new();
    for _ in 0..200 {
        let x = read_i32(data, cursor)?;
        cursor += 4;
        if x == -1 {
            return Ok(points);
        }
        let y = read_i32(data, cursor)?;
        let world_id = read_i32(data, cursor + 4)?;
        let (world_name, end) = read_dotnet_string(data, cursor + 8)?;
        points.push(SpawnPoint {
            x,
            y,
            world_id,
            world_name,
        });
        cursor = end;
    }
    Err(SaveError::Validation(
        "spawn-point list has no v325 terminator".into(),
    ))
}

fn read_research(data: &[u8], base: usize) -> Result<Vec<ResearchEntry>, SaveError> {
    let count = read_i32(data, base + 1)?;
    if !(0..=20_000).contains(&count) {
        return Err(SaveError::Validation(format!(
            "creative research entry count {count} is not credible"
        )));
    }
    let mut cursor = base + 5;
    let mut entries = Vec::with_capacity(count as usize);
    for _ in 0..count {
        let (persistent_id, end) = read_dotnet_string(data, cursor)?;
        let value = read_i32(data, end)?;
        entries.push(ResearchEntry {
            persistent_id,
            count: value,
        });
        cursor = end + 4;
    }
    Ok(entries)
}

fn read_journey_powers(
    data: &[u8],
    mut cursor: usize,
) -> Result<(JourneyPowers, Vec<u16>), SaveError> {
    let mut powers = JourneyPowers {
        godmode: false,
        far_placement_range: true,
        spawn_rate: 0.5,
    };
    let mut serialized_ids = Vec::new();
    loop {
        if !read_bool(data, cursor)? {
            return Ok((powers, serialized_ids));
        }
        cursor += 1;
        let power_id = read_u16(data, cursor)?;
        cursor += 2;
        serialized_ids.push(power_id);
        match power_id {
            5 => {
                powers.godmode = read_bool(data, cursor)?;
                cursor += 1;
            }
            11 => {
                powers.far_placement_range = read_bool(data, cursor)?;
                cursor += 1;
            }
            14 => {
                powers.spawn_rate = read_f32(data, cursor)?;
                cursor += 4;
            }
            _ => {
                return Err(SaveError::Validation(format!(
                    "Journey power ID {power_id} has an unknown v325 payload"
                )))
            }
        }
    }
}

pub fn validate_document(
    character: &CharacterDocument,
    effects: &EffectsDocument,
    journey: &JourneyDocument,
    spawn_points: &[SpawnPoint],
    inventory: &[ItemSlot],
    equipment: &EquipmentDocument,
    storage: &StorageDocument,
) -> Result<(), SaveError> {
    validate_character(character)?;
    validate_effects(effects)?;
    validate_journey(journey)?;
    validate_spawn_points(spawn_points)?;
    validate_slots(
        inventory,
        INVENTORY_RECORDS,
        "inventory",
        StackRule::Stackable,
    )?;
    if equipment.misc_hidden.len() != MISC_RECORDS {
        return Err(SaveError::Validation(format!(
            "misc equipment must contain {MISC_RECORDS} visibility flags"
        )));
    }
    if equipment.current_loadout_index as usize >= LOADOUT_RECORDS {
        return Err(SaveError::Validation(
            "current loadout index must be 0, 1, or 2".into(),
        ));
    }
    if equipment.loadouts.len() != LOADOUT_RECORDS {
        return Err(SaveError::Validation(format!(
            "expected {LOADOUT_RECORDS} loadouts, received {}",
            equipment.loadouts.len()
        )));
    }
    for (index, loadout) in equipment.loadouts.iter().enumerate() {
        validate_slots(
            &loadout.armor,
            ARMOR_RECORDS,
            &format!("loadout {} armor", index + 1),
            StackRule::Single,
        )?;
        validate_slots(
            &loadout.dyes,
            DYE_RECORDS,
            &format!("loadout {} dyes", index + 1),
            StackRule::Single,
        )?;
        if loadout.hidden.len() != DYE_RECORDS {
            return Err(SaveError::Validation(format!(
                "loadout {} must contain {DYE_RECORDS} visibility flags",
                index + 1
            )));
        }
    }
    validate_slots(
        &equipment.misc_equips,
        MISC_RECORDS,
        "misc equipment",
        StackRule::Single,
    )?;
    validate_slots(
        &equipment.misc_dyes,
        MISC_RECORDS,
        "misc dyes",
        StackRule::Single,
    )?;
    validate_slots(
        &storage.piggy_bank,
        BANK_RECORDS,
        "piggy bank",
        StackRule::Stackable,
    )?;
    validate_slots(&storage.safe, BANK_RECORDS, "safe", StackRule::Stackable)?;
    validate_slots(
        &storage.defenders_forge,
        BANK_RECORDS,
        "Defender's Forge",
        StackRule::Stackable,
    )?;
    validate_slots(
        &storage.void_vault,
        BANK_RECORDS,
        "Void Vault",
        StackRule::Stackable,
    )?;
    Ok(())
}

pub(super) struct PatchDocument<'a> {
    pub character: &'a CharacterDocument,
    pub effects: &'a EffectsDocument,
    pub journey: &'a JourneyDocument,
    pub spawn_points: &'a [SpawnPoint],
    pub inventory: &'a [ItemSlot],
    pub equipment: &'a EquipmentDocument,
    pub storage: &'a StorageDocument,
}

pub(super) fn patch_document(
    data: &[u8],
    document: PatchDocument<'_>,
) -> Result<Vec<u8>, SaveError> {
    let PatchDocument {
        character,
        effects,
        journey,
        spawn_points,
        inventory,
        equipment,
        storage,
    } = document;
    validate_document(
        character,
        effects,
        journey,
        spawn_points,
        inventory,
        equipment,
        storage,
    )?;
    let original_layout = locate_layout(data)?;
    let original_index = read_i32(data, original_layout.current_loadout_index)?;
    if original_index != equipment.current_loadout_index as i32 {
        return Err(SaveError::Validation(
            "changing the active loadout is not enabled yet; switch it in Terraria and reload the file".into(),
        ));
    }

    let mut patched = data.to_vec();
    let encoded_name = encode_dotnet_string(&character.name);
    patched.splice(METADATA_END..original_layout.name_end, encoded_name);
    let mut layout = locate_layout(&patched)?;
    write_effects(&mut patched, layout.buffs, effects);
    patched.splice(
        layout.spawn_points..layout.spawn_points_end,
        encode_spawn_points(spawn_points),
    );
    layout = locate_layout(&patched)?;
    patched.splice(
        layout.research..layout.research_end,
        encode_research(&journey.research),
    );
    layout = locate_layout(&patched)?;
    patched.splice(
        layout.powers..layout.powers_end,
        encode_journey_powers(&journey.powers, &journey.serialized_power_ids),
    );
    layout = locate_layout(&patched)?;
    let mut super_cart = patched[layout.super_cart] & !0b11;
    super_cart |= u8::from(journey.unlocked_super_cart);
    super_cart |= u8::from(journey.enabled_super_cart) << 1;
    patched[layout.super_cart] = super_cart;
    write_character(&mut patched, layout, character)?;
    write_slots(
        &mut patched,
        layout.inventory,
        inventory,
        INVENTORY_RECORD_SIZE,
        true,
    );
    let active_index = equipment.current_loadout_index as usize;
    write_active_loadout(&mut patched, layout, &equipment.loadouts[active_index]);
    for (index, loadout) in equipment.loadouts.iter().enumerate() {
        if index != active_index {
            write_serialized_loadout(
                &mut patched,
                layout.loadouts + index * LOADOUT_SIZE,
                loadout,
            );
        }
    }
    for slot in 0..MISC_RECORDS {
        write_compact_item(
            &mut patched,
            layout.misc + slot * COMPACT_ITEM_SIZE * 2,
            &equipment.misc_equips[slot],
        );
        write_compact_item(
            &mut patched,
            layout.misc + slot * COMPACT_ITEM_SIZE * 2 + COMPACT_ITEM_SIZE,
            &equipment.misc_dyes[slot],
        );
    }
    let mut misc_flags = patched[layout.name_end + 17] & !0b1_1111;
    for (index, hidden) in equipment.misc_hidden.iter().copied().enumerate() {
        if hidden {
            misc_flags |= 1 << index;
        }
    }
    patched[layout.name_end + 17] = misc_flags;
    write_slots(
        &mut patched,
        layout.banks[0],
        &storage.piggy_bank,
        BANK_RECORD_SIZE,
        false,
    );
    write_slots(
        &mut patched,
        layout.banks[1],
        &storage.safe,
        BANK_RECORD_SIZE,
        false,
    );
    write_slots(
        &mut patched,
        layout.banks[2],
        &storage.defenders_forge,
        BANK_RECORD_SIZE,
        false,
    );
    write_slots(
        &mut patched,
        layout.banks[3],
        &storage.void_vault,
        INVENTORY_RECORD_SIZE,
        true,
    );
    Ok(patched)
}

fn validate_character(character: &CharacterDocument) -> Result<(), SaveError> {
    let name_units = character.name.encode_utf16().count();
    if character.name.trim().is_empty() || name_units > 20 {
        return Err(SaveError::Validation(
            "character name must contain 1 to 20 UTF-16 characters".into(),
        ));
    }
    if character.difficulty > 3 {
        return Err(SaveError::Validation(
            "difficulty must be Classic, Mediumcore, Hardcore, or Journey".into(),
        ));
    }
    let play_time = character.play_time_ticks.parse::<i64>().map_err(|_| {
        SaveError::Validation("play time must be a signed 64-bit tick count".into())
    })?;
    if play_time < 0 {
        return Err(SaveError::Validation("play time cannot be negative".into()));
    }
    let stats = &character.stats;
    if !(0..=500).contains(&stats.life_max) {
        return Err(SaveError::Validation(
            "maximum health must be between 0 and 500".into(),
        ));
    }
    if !(-1000..=1000).contains(&stats.life) {
        return Err(SaveError::Validation(
            "current health is outside Terraria's supported save range".into(),
        ));
    }
    if !(0..=200).contains(&stats.mana_max) {
        return Err(SaveError::Validation(
            "maximum mana must be between 0 and 200".into(),
        ));
    }
    if !(-1000..=400).contains(&stats.mana) {
        return Err(SaveError::Validation(
            "current mana is outside Terraria's supported save range".into(),
        ));
    }

    let appearance = &character.appearance;
    if !(0..=227).contains(&appearance.hair) {
        return Err(SaveError::Validation(
            "hair style must be between 0 and 227 for Terraria v325".into(),
        ));
    }
    if appearance.team > 5 {
        return Err(SaveError::Validation(
            "team must be None, Red, Green, Blue, Yellow, or Pink".into(),
        ));
    }
    if appearance.skin_variant > 11 {
        return Err(SaveError::Validation(
            "character style must be between 0 and 11".into(),
        ));
    }
    if !(1..=4).contains(&appearance.voice_variant) {
        return Err(SaveError::Validation(
            "voice variant must be between 1 and 4".into(),
        ));
    }
    if !appearance.voice_pitch.is_finite() || !(-1.0..=1.0).contains(&appearance.voice_pitch) {
        return Err(SaveError::Validation(
            "voice pitch must be a finite value from -1.0 to 1.0".into(),
        ));
    }
    if character.counters.tax_money < 0
        || character.counters.pve_deaths < 0
        || character.counters.pvp_deaths < 0
    {
        return Err(SaveError::Validation(
            "tax savings and death counters cannot be negative".into(),
        ));
    }
    Ok(())
}

fn validate_effects(effects: &EffectsDocument) -> Result<(), SaveError> {
    if effects.buffs.len() != BUFF_RECORDS {
        return Err(SaveError::Validation(format!(
            "saved effects must contain exactly {BUFF_RECORDS} slots"
        )));
    }
    for (index, buff) in effects.buffs.iter().enumerate() {
        if buff.slot as usize != index {
            return Err(SaveError::Validation(format!(
                "saved effect slots are out of order at position {index}"
            )));
        }
        if !(0..=400).contains(&buff.buff_id) {
            return Err(SaveError::Validation(format!(
                "saved effect slot {} has invalid buff ID {} for Terraria v325",
                index + 1,
                buff.buff_id
            )));
        }
        let valid_time = if buff.buff_id == 0 {
            buff.time == 0
        } else {
            buff.time > 0
        };
        if !valid_time {
            return Err(SaveError::Validation(format!(
                "saved effect slot {} has invalid duration {}",
                index + 1,
                buff.time
            )));
        }
    }
    Ok(())
}

fn validate_spawn_points(points: &[SpawnPoint]) -> Result<(), SaveError> {
    if points.len() > 199 {
        return Err(SaveError::Validation(
            "Terraria v325 supports at most 199 saved spawn points plus its terminator".into(),
        ));
    }
    for (index, point) in points.iter().enumerate() {
        if point.x == -1 {
            return Err(SaveError::Validation(format!(
                "spawn point {} uses Terraria's reserved terminator coordinate",
                index + 1
            )));
        }
        if point.world_name.trim().is_empty() || point.world_name.len() > 1024 {
            return Err(SaveError::Validation(format!(
                "spawn point {} must have a world name no longer than 1024 UTF-8 bytes",
                index + 1
            )));
        }
    }
    Ok(())
}

fn validate_journey(journey: &JourneyDocument) -> Result<(), SaveError> {
    if journey.research.len() > 20_000 {
        return Err(SaveError::Validation(
            "Journey research contains more than 20,000 entries".into(),
        ));
    }
    let mut ids = std::collections::HashSet::new();
    for entry in &journey.research {
        if entry.persistent_id.trim().is_empty() || entry.persistent_id.len() > 256 {
            return Err(SaveError::Validation(
                "Journey research keys must contain 1 to 256 UTF-8 bytes".into(),
            ));
        }
        if !ids.insert(&entry.persistent_id) {
            return Err(SaveError::Validation(format!(
                "Journey research key {} appears more than once",
                entry.persistent_id
            )));
        }
        if !(0..=9999).contains(&entry.count) {
            return Err(SaveError::Validation(format!(
                "Journey research count for {} must be between 0 and 9999",
                entry.persistent_id
            )));
        }
    }
    if !journey.powers.spawn_rate.is_finite() || !(0.0..=1.0).contains(&journey.powers.spawn_rate) {
        return Err(SaveError::Validation(
            "Journey enemy spawn-rate slider must be from 0.0 to 1.0".into(),
        ));
    }
    let mut power_ids = std::collections::HashSet::new();
    for power_id in &journey.serialized_power_ids {
        if !matches!(power_id, 5 | 11 | 14) || !power_ids.insert(power_id) {
            return Err(SaveError::Validation(
                "Journey power records must contain unique supported IDs 5, 11, or 14".into(),
            ));
        }
    }
    Ok(())
}

fn write_effects(data: &mut [u8], base: usize, effects: &EffectsDocument) {
    for buff in &effects.buffs {
        let offset = base + buff.slot as usize * BUFF_RECORD_SIZE;
        data[offset..offset + 4].copy_from_slice(&buff.buff_id.to_le_bytes());
        data[offset + 4..offset + 8].copy_from_slice(&buff.time.to_le_bytes());
    }
}

fn encode_spawn_points(points: &[SpawnPoint]) -> Vec<u8> {
    let mut encoded = Vec::new();
    for point in points {
        encoded.extend_from_slice(&point.x.to_le_bytes());
        encoded.extend_from_slice(&point.y.to_le_bytes());
        encoded.extend_from_slice(&point.world_id.to_le_bytes());
        encoded.extend_from_slice(&encode_dotnet_string(&point.world_name));
    }
    encoded.extend_from_slice(&(-1i32).to_le_bytes());
    encoded
}

fn encode_research(entries: &[ResearchEntry]) -> Vec<u8> {
    let mut encoded = Vec::new();
    encoded.push(0);
    encoded.extend_from_slice(&(entries.len() as i32).to_le_bytes());
    for entry in entries {
        encoded.extend_from_slice(&encode_dotnet_string(&entry.persistent_id));
        encoded.extend_from_slice(&entry.count.to_le_bytes());
    }
    encoded
}

fn encode_journey_powers(powers: &JourneyPowers, serialized_ids: &[u16]) -> Vec<u8> {
    let mut encoded = Vec::with_capacity(16);
    for id in serialized_ids {
        let payload = match id {
            5 => vec![u8::from(powers.godmode)],
            11 => vec![u8::from(powers.far_placement_range)],
            14 => powers.spawn_rate.to_le_bytes().to_vec(),
            _ => continue,
        };
        encoded.push(1);
        encoded.extend_from_slice(&id.to_le_bytes());
        encoded.extend_from_slice(&payload);
    }
    encoded.push(0);
    encoded
}

fn write_character(
    data: &mut [u8],
    layout: Layout,
    character: &CharacterDocument,
) -> Result<(), SaveError> {
    let base = layout.name_end;
    data[base] = character.difficulty;
    let ticks = character.play_time_ticks.parse::<i64>().map_err(|_| {
        SaveError::Validation("play time must be a signed 64-bit tick count".into())
    })?;
    data[base + 1..base + 9].copy_from_slice(&ticks.to_le_bytes());
    data[base + 9..base + 13].copy_from_slice(&character.appearance.hair.to_le_bytes());
    data[base + 13] = character.appearance.hair_dye;
    data[base + 14] = character.appearance.team;
    data[base + 18] = character.appearance.skin_variant;
    data[base + 19..base + 23].copy_from_slice(&character.stats.life.to_le_bytes());
    data[base + 23..base + 27].copy_from_slice(&character.stats.life_max.to_le_bytes());
    data[base + 27..base + 31].copy_from_slice(&character.stats.mana.to_le_bytes());
    data[base + 31..base + 35].copy_from_slice(&character.stats.mana_max.to_le_bytes());

    let upgrades = &character.upgrades;
    data[base + 35] = u8::from(upgrades.extra_accessory);
    data[base + 36] = u8::from(upgrades.unlocked_biome_torches);
    data[base + 37] = u8::from(upgrades.using_biome_torches);
    data[base + 38] = u8::from(upgrades.ate_artisan_bread);
    data[base + 39] = 0;
    data[base + 40] = u8::from(upgrades.used_aegis_crystal);
    data[base + 41] = u8::from(upgrades.used_aegis_fruit);
    data[base + 42] = u8::from(upgrades.used_arcane_crystal);
    data[base + 43] = u8::from(upgrades.used_galaxy_pearl);
    data[base + 44] = u8::from(upgrades.used_gummy_worm);
    data[base + 45] = u8::from(upgrades.used_ambrosia);
    data[base + 46] = u8::from(upgrades.downed_dd2_event);
    data[base + 47..base + 51].copy_from_slice(&character.counters.tax_money.to_le_bytes());
    data[base + 51..base + 55].copy_from_slice(&character.counters.pve_deaths.to_le_bytes());
    data[base + 55..base + 59].copy_from_slice(&character.counters.pvp_deaths.to_le_bytes());

    for (offset, color) in [
        character.appearance.hair_color,
        character.appearance.skin_color,
        character.appearance.eye_color,
        character.appearance.shirt_color,
        character.appearance.under_shirt_color,
        character.appearance.pants_color,
        character.appearance.shoe_color,
    ]
    .into_iter()
    .enumerate()
    {
        write_color(data, base + 59 + offset * 3, color);
    }
    data[layout.voice_variant] = character.appearance.voice_variant;
    data[layout.voice_pitch..layout.voice_pitch + 4]
        .copy_from_slice(&character.appearance.voice_pitch.to_le_bytes());
    Ok(())
}

#[derive(Clone, Copy)]
enum StackRule {
    Stackable,
    Single,
}

fn validate_slots(
    items: &[ItemSlot],
    expected: usize,
    label: &str,
    rule: StackRule,
) -> Result<(), SaveError> {
    if items.len() != expected {
        return Err(SaveError::Validation(format!(
            "expected {expected} {label} slots, received {}",
            items.len()
        )));
    }
    for (index, item) in items.iter().enumerate() {
        if item.slot as usize != index {
            return Err(SaveError::Validation(format!(
                "{label} slot list is out of order at position {index}"
            )));
        }
        if !(0..=20_000).contains(&item.item_id) {
            return Err(SaveError::Validation(format!(
                "{label} slot {} has invalid item ID {}",
                index + 1,
                item.item_id
            )));
        }
        let valid_stack = if item.item_id == 0 {
            item.stack == 0
        } else {
            match rule {
                StackRule::Stackable => (1..=9999).contains(&item.stack),
                StackRule::Single => item.stack == 1,
            }
        };
        if !valid_stack {
            return Err(SaveError::Validation(format!(
                "{label} slot {} has invalid stack {}",
                index + 1,
                item.stack
            )));
        }
    }
    Ok(())
}

fn locate_layout(data: &[u8]) -> Result<Layout, SaveError> {
    let version = read_i32(data, 0)?;
    if version != VERSION {
        return Err(SaveError::UnsupportedVersion(version));
    }
    let (_, name_end) = read_dotnet_string(data, METADATA_END)?;
    let armor = name_end + HEADER_AFTER_NAME;
    let dyes = armor + ARMOR_RECORDS * EQUIPMENT_RECORD_SIZE;
    let inventory = dyes + DYE_RECORDS * EQUIPMENT_RECORD_SIZE;
    let misc = inventory + INVENTORY_RECORDS * INVENTORY_RECORD_SIZE;
    let bank1 = misc + MISC_RECORDS * COMPACT_ITEM_SIZE * 2;
    let bank2 = bank1 + BANK_RECORDS * BANK_RECORD_SIZE;
    let bank3 = bank2 + BANK_RECORDS * BANK_RECORD_SIZE;
    let bank4 = bank3 + BANK_RECORDS * BANK_RECORD_SIZE;
    let buffs = bank4 + BANK_RECORDS * INVENTORY_RECORD_SIZE + 1;
    let mut cursor = checked_advance(data, buffs, BUFF_RECORDS * BUFF_RECORD_SIZE)?;
    let spawn_points = cursor;

    let mut found_spawn_end = false;
    for _ in 0..200 {
        let spawn_x = read_i32(data, cursor)?;
        cursor += 4;
        if spawn_x == -1 {
            found_spawn_end = true;
            break;
        }
        cursor = checked_advance(data, cursor, 8)?;
        let (_, end) = read_dotnet_string(data, cursor)?;
        cursor = end;
    }
    if !found_spawn_end {
        return Err(SaveError::Validation(
            "spawn-point list has no v325 terminator".into(),
        ));
    }
    let spawn_points_end = cursor;

    cursor = checked_advance(data, cursor, 1 + 13 + 4 + 4 * 4 + 12 * 4 + 4)?;
    let dead = read_u8(data, cursor)? != 0;
    cursor += 1;
    if dead {
        cursor = checked_advance(data, cursor, 4)?;
    }
    cursor = checked_advance(data, cursor, 8 + 4)?;

    let research = cursor;
    cursor = checked_advance(data, cursor, 1)?;
    let sacrifice_count = read_i32(data, cursor)?;
    cursor += 4;
    if !(0..=20_000).contains(&sacrifice_count) {
        return Err(SaveError::Validation(format!(
            "creative research entry count {sacrifice_count} is not credible"
        )));
    }
    for _ in 0..sacrifice_count {
        let (_, end) = read_dotnet_string(data, cursor)?;
        cursor = checked_advance(data, end, 4)?;
    }
    let research_end = cursor;

    let temporary_slots = read_u8(data, cursor)?;
    cursor += 1;
    for bit in 0..4 {
        if temporary_slots & (1 << bit) != 0 {
            cursor = checked_advance(data, cursor, BANK_RECORD_SIZE)?;
        }
    }

    let powers = cursor;
    loop {
        let has_power = read_u8(data, cursor)? != 0;
        cursor += 1;
        if !has_power {
            break;
        }
        let power_id = read_u16(data, cursor)?;
        cursor += 2;
        let payload_size = match power_id {
            5 | 11 => 1,
            14 => 4,
            _ => {
                return Err(SaveError::Validation(format!(
                    "Journey power ID {power_id} has an unknown v325 payload"
                )))
            }
        };
        cursor = checked_advance(data, cursor, payload_size)?;
    }
    let powers_end = cursor;

    let super_cart = cursor;
    cursor = checked_advance(data, cursor, 1)?;
    let current_loadout_index = cursor;
    cursor = checked_advance(data, cursor, 4)?;
    let loadouts = cursor;
    let voice_variant = checked_advance(data, loadouts, LOADOUT_RECORDS * LOADOUT_SIZE)?;
    let voice_pitch = checked_advance(data, voice_variant, 1)?;
    checked_advance(data, voice_pitch, 4)?;

    Ok(Layout {
        name_end,
        armor,
        dyes,
        inventory,
        misc,
        banks: [bank1, bank2, bank3, bank4],
        buffs,
        spawn_points,
        spawn_points_end,
        research,
        research_end,
        powers,
        powers_end,
        super_cart,
        current_loadout_index,
        loadouts,
        voice_variant,
        voice_pitch,
    })
}

fn read_active_loadout(data: &[u8], layout: Layout) -> Result<EquipmentLoadout, SaveError> {
    let first_flags = read_u8(data, layout.name_end + 15)?;
    let second_flags = read_u8(data, layout.name_end + 16)?;
    let hidden = (0..DYE_RECORDS)
        .map(|index| {
            if index < 8 {
                first_flags & (1 << index) != 0
            } else {
                second_flags & (1 << (index - 8)) != 0
            }
        })
        .collect();
    Ok(EquipmentLoadout {
        armor: read_equipment_slots(data, layout.armor, ARMOR_RECORDS)?,
        dyes: read_equipment_slots(data, layout.dyes, DYE_RECORDS)?,
        hidden,
    })
}

fn read_serialized_loadout(data: &[u8], base: usize) -> Result<EquipmentLoadout, SaveError> {
    let armor = read_slots(data, base, ARMOR_RECORDS, INVENTORY_RECORD_SIZE, true)?;
    let dye_base = base + ARMOR_RECORDS * INVENTORY_RECORD_SIZE;
    let dyes = read_slots(data, dye_base, DYE_RECORDS, INVENTORY_RECORD_SIZE, true)?;
    let hide_base = dye_base + DYE_RECORDS * INVENTORY_RECORD_SIZE;
    let hidden = (0..DYE_RECORDS)
        .map(|index| read_u8(data, hide_base + index).map(|value| value != 0))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(EquipmentLoadout {
        armor,
        dyes,
        hidden,
    })
}

fn read_equipment_slots(
    data: &[u8],
    base: usize,
    count: usize,
) -> Result<Vec<ItemSlot>, SaveError> {
    (0..count)
        .map(|slot| {
            let offset = base + slot * EQUIPMENT_RECORD_SIZE;
            let item_id = read_i32(data, offset)?;
            Ok(ItemSlot {
                slot: slot as u8,
                item_id,
                stack: i32::from(item_id != 0),
                prefix: read_u8(data, offset + 4)?,
                favorited: read_u8(data, offset + 5)? != 0,
            })
        })
        .collect()
}

fn read_compact_item(data: &[u8], offset: usize, slot: usize) -> Result<ItemSlot, SaveError> {
    let item_id = read_i32(data, offset)?;
    Ok(ItemSlot {
        slot: slot as u8,
        item_id,
        stack: i32::from(item_id != 0),
        prefix: read_u8(data, offset + 4)?,
        favorited: false,
    })
}

fn read_slots(
    data: &[u8],
    base: usize,
    count: usize,
    record_size: usize,
    has_favorite: bool,
) -> Result<Vec<ItemSlot>, SaveError> {
    (0..count)
        .map(|slot| {
            let offset = base + slot * record_size;
            Ok(ItemSlot {
                slot: slot as u8,
                item_id: read_i32(data, offset)?,
                stack: read_i32(data, offset + 4)?,
                prefix: read_u8(data, offset + 8)?,
                favorited: has_favorite && read_u8(data, offset + 9)? != 0,
            })
        })
        .collect()
}

fn write_active_loadout(data: &mut [u8], layout: Layout, loadout: &EquipmentLoadout) {
    for item in &loadout.armor {
        let offset = layout.armor + item.slot as usize * EQUIPMENT_RECORD_SIZE;
        write_equipment_item(data, offset, item);
    }
    for item in &loadout.dyes {
        let offset = layout.dyes + item.slot as usize * EQUIPMENT_RECORD_SIZE;
        write_equipment_item(data, offset, item);
    }
    let mut first_flags = 0u8;
    let mut second_flags = data[layout.name_end + 16] & !0b11;
    for (index, hidden) in loadout.hidden.iter().copied().enumerate() {
        if hidden {
            if index < 8 {
                first_flags |= 1 << index;
            } else {
                second_flags |= 1 << (index - 8);
            }
        }
    }
    data[layout.name_end + 15] = first_flags;
    data[layout.name_end + 16] = second_flags;
}

fn write_serialized_loadout(data: &mut [u8], base: usize, loadout: &EquipmentLoadout) {
    write_slots(data, base, &loadout.armor, INVENTORY_RECORD_SIZE, true);
    let dye_base = base + ARMOR_RECORDS * INVENTORY_RECORD_SIZE;
    write_slots(data, dye_base, &loadout.dyes, INVENTORY_RECORD_SIZE, true);
    let hide_base = dye_base + DYE_RECORDS * INVENTORY_RECORD_SIZE;
    for (index, hidden) in loadout.hidden.iter().copied().enumerate() {
        data[hide_base + index] = u8::from(hidden);
    }
}

fn write_equipment_item(data: &mut [u8], offset: usize, item: &ItemSlot) {
    data[offset..offset + 4].copy_from_slice(&item.item_id.to_le_bytes());
    data[offset + 4] = item.prefix;
    data[offset + 5] = u8::from(item.favorited);
}

fn write_compact_item(data: &mut [u8], offset: usize, item: &ItemSlot) {
    data[offset..offset + 4].copy_from_slice(&item.item_id.to_le_bytes());
    data[offset + 4] = item.prefix;
}

fn write_slots(
    data: &mut [u8],
    base: usize,
    items: &[ItemSlot],
    record_size: usize,
    has_favorite: bool,
) {
    for item in items {
        let offset = base + item.slot as usize * record_size;
        data[offset..offset + 4].copy_from_slice(&item.item_id.to_le_bytes());
        data[offset + 4..offset + 8].copy_from_slice(&item.stack.to_le_bytes());
        data[offset + 8] = item.prefix;
        if has_favorite {
            data[offset + 9] = u8::from(item.favorited);
        }
    }
}

fn checked_advance(data: &[u8], offset: usize, amount: usize) -> Result<usize, SaveError> {
    let end = offset.checked_add(amount).ok_or(SaveError::Truncated)?;
    if end > data.len() {
        return Err(SaveError::Truncated);
    }
    Ok(end)
}

fn read_dotnet_string(data: &[u8], offset: usize) -> Result<(String, usize), SaveError> {
    let (length, start) = read_7bit_int(data, offset)?;
    let end = start.checked_add(length).ok_or(SaveError::Truncated)?;
    let bytes = data.get(start..end).ok_or(SaveError::Truncated)?;
    let value = std::str::from_utf8(bytes).map_err(|_| SaveError::Truncated)?;
    Ok((value.into(), end))
}

fn encode_dotnet_string(value: &str) -> Vec<u8> {
    let bytes = value.as_bytes();
    let mut length = bytes.len();
    let mut encoded = Vec::with_capacity(bytes.len() + 5);
    while length >= 0x80 {
        encoded.push((length as u8) | 0x80);
        length >>= 7;
    }
    encoded.push(length as u8);
    encoded.extend_from_slice(bytes);
    encoded
}

fn read_bool(data: &[u8], offset: usize) -> Result<bool, SaveError> {
    Ok(read_u8(data, offset)? != 0)
}

fn read_color(data: &[u8], offset: usize) -> Result<RgbColor, SaveError> {
    Ok(RgbColor {
        r: read_u8(data, offset)?,
        g: read_u8(data, offset + 1)?,
        b: read_u8(data, offset + 2)?,
    })
}

fn write_color(data: &mut [u8], offset: usize, color: RgbColor) {
    data[offset] = color.r;
    data[offset + 1] = color.g;
    data[offset + 2] = color.b;
}

fn read_7bit_int(data: &[u8], mut offset: usize) -> Result<(usize, usize), SaveError> {
    let mut value = 0usize;
    let mut shift = 0usize;
    loop {
        let byte = read_u8(data, offset)?;
        offset += 1;
        value |= ((byte & 0x7f) as usize) << shift;
        if byte & 0x80 == 0 {
            return Ok((value, offset));
        }
        shift += 7;
        if shift >= 35 {
            return Err(SaveError::Truncated);
        }
    }
}

fn read_u8(data: &[u8], offset: usize) -> Result<u8, SaveError> {
    data.get(offset).copied().ok_or(SaveError::Truncated)
}

fn read_u16(data: &[u8], offset: usize) -> Result<u16, SaveError> {
    let bytes: [u8; 2] = data
        .get(offset..offset + 2)
        .ok_or(SaveError::Truncated)?
        .try_into()
        .map_err(|_| SaveError::Truncated)?;
    Ok(u16::from_le_bytes(bytes))
}

fn read_i32(data: &[u8], offset: usize) -> Result<i32, SaveError> {
    let bytes: [u8; 4] = data
        .get(offset..offset + 4)
        .ok_or(SaveError::Truncated)?
        .try_into()
        .map_err(|_| SaveError::Truncated)?;
    Ok(i32::from_le_bytes(bytes))
}

fn read_i64(data: &[u8], offset: usize) -> Result<i64, SaveError> {
    let bytes: [u8; 8] = data
        .get(offset..offset + 8)
        .ok_or(SaveError::Truncated)?
        .try_into()
        .map_err(|_| SaveError::Truncated)?;
    Ok(i64::from_le_bytes(bytes))
}

fn read_f32(data: &[u8], offset: usize) -> Result<f32, SaveError> {
    let bytes: [u8; 4] = data
        .get(offset..offset + 4)
        .ok_or(SaveError::Truncated)?
        .try_into()
        .map_err(|_| SaveError::Truncated)?;
    Ok(f32::from_le_bytes(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn synthetic_player(name: &str) -> Vec<u8> {
        let mut data = vec![0u8; 5000];
        data[0..4].copy_from_slice(&VERSION.to_le_bytes());
        data[24] = name.len() as u8;
        data[25..25 + name.len()].copy_from_slice(name.as_bytes());
        let name_end = 25 + name.len();
        data[name_end] = 1;
        data[name_end + 9..name_end + 13].copy_from_slice(&17i32.to_le_bytes());
        data[name_end + 19..name_end + 23].copy_from_slice(&400i32.to_le_bytes());
        data[name_end + 23..name_end + 27].copy_from_slice(&500i32.to_le_bytes());
        data[name_end + 27..name_end + 31].copy_from_slice(&180i32.to_le_bytes());
        data[name_end + 31..name_end + 35].copy_from_slice(&200i32.to_le_bytes());

        let bank4 = name_end
            + HEADER_AFTER_NAME
            + ARMOR_RECORDS * EQUIPMENT_RECORD_SIZE
            + DYE_RECORDS * EQUIPMENT_RECORD_SIZE
            + INVENTORY_RECORDS * INVENTORY_RECORD_SIZE
            + MISC_RECORDS * COMPACT_ITEM_SIZE * 2
            + BANK_RECORDS * BANK_RECORD_SIZE * 3;
        let spawn_sentinel =
            bank4 + BANK_RECORDS * INVENTORY_RECORD_SIZE + 1 + BUFF_RECORDS * BUFF_RECORD_SIZE;
        data[spawn_sentinel..spawn_sentinel + 4].copy_from_slice(&(-1i32).to_le_bytes());
        let layout = locate_layout(&data).unwrap();
        data[layout.voice_variant] = 1;
        data
    }

    #[test]
    fn dynamic_name_length_moves_all_fixed_surfaces() {
        for name in ["A", "NewBruv", "A deliberately longer player"] {
            let data = synthetic_player(name);
            let layout = locate_layout(&data).unwrap();
            assert_eq!(layout.inventory, 25 + name.len() + 260);
            assert_eq!(layout.misc, layout.inventory + 580);
            assert!(layout.loadouts > layout.banks[3]);
        }
    }

    #[test]
    fn active_loadout_replaces_only_the_matching_serialized_view() {
        let mut data = synthetic_player("NewBruv");
        let layout = locate_layout(&data).unwrap();
        data[layout.armor..layout.armor + 4].copy_from_slice(&100i32.to_le_bytes());
        data[layout.loadouts..layout.loadouts + 4].copy_from_slice(&200i32.to_le_bytes());
        let document = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        assert_eq!(document.equipment.current_loadout_index, 0);
        assert_eq!(document.equipment.loadouts[0].armor[0].item_id, 100);
    }

    #[test]
    fn patches_only_supported_item_ranges() {
        let data = synthetic_player("NewBruv");
        let before = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        let mut inventory = before.inventory.clone();
        inventory[18] = ItemSlot {
            slot: 18,
            item_id: 3043,
            stack: 1,
            prefix: 0,
            favorited: false,
        };
        let mut equipment = before.equipment.clone();
        equipment.loadouts[0].armor[3] = ItemSlot {
            slot: 3,
            item_id: 111,
            stack: 1,
            prefix: 2,
            favorited: true,
        };
        let mut storage = before.storage.clone();
        storage.safe[7] = ItemSlot {
            slot: 7,
            item_id: 2768,
            stack: 1,
            prefix: 0,
            favorited: false,
        };

        let patched = patch_document(
            &data,
            PatchDocument {
                character: &before.character,
                effects: &before.effects,
                journey: &before.journey,
                spawn_points: &before.spawn_points,
                inventory: &inventory,
                equipment: &equipment,
                storage: &storage,
            },
        )
        .unwrap();
        let after = parse(Path::new("fixture.plr"), "hash", &patched).unwrap();
        assert_eq!(after.inventory[18].item_id, 3043);
        assert_eq!(after.equipment.loadouts[0].armor[3].item_id, 111);
        assert_eq!(after.storage.safe[7].item_id, 2768);

        let layout = locate_layout(&data).unwrap();
        let inventory_byte = layout.inventory + 18 * INVENTORY_RECORD_SIZE;
        let armor_byte = layout.armor + 3 * EQUIPMENT_RECORD_SIZE;
        let safe_byte = layout.banks[1] + 7 * BANK_RECORD_SIZE;
        for index in 0..data.len() {
            let supported = (inventory_byte..inventory_byte + INVENTORY_RECORD_SIZE)
                .contains(&index)
                || (armor_byte..armor_byte + EQUIPMENT_RECORD_SIZE).contains(&index)
                || (safe_byte..safe_byte + BANK_RECORD_SIZE).contains(&index);
            if !supported {
                assert_eq!(
                    patched[index], data[index],
                    "unexpected mutation at byte {index}"
                );
            }
        }
    }

    #[test]
    fn rejects_invalid_equipment_stack() {
        let data = synthetic_player("NewBruv");
        let document = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        let mut equipment = document.equipment.clone();
        equipment.loadouts[0].armor[0] = ItemSlot {
            slot: 0,
            item_id: 1,
            stack: 2,
            prefix: 0,
            favorited: false,
        };
        let error = validate_document(
            &document.character,
            &document.effects,
            &document.journey,
            &document.spawn_points,
            &document.inventory,
            &equipment,
            &document.storage,
        )
        .unwrap_err();
        assert!(error.to_string().contains("invalid stack"));
    }

    #[test]
    fn patches_inactive_loadout_misc_visibility_and_void_favorites() {
        let mut data = synthetic_player("NewBruv");
        let layout = locate_layout(&data).unwrap();
        data[layout.loadouts..layout.loadouts + 4].copy_from_slice(&200i32.to_le_bytes());
        let before = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        let mut equipment = before.equipment.clone();
        equipment.loadouts[1].armor[0] = ItemSlot {
            slot: 0,
            item_id: 90,
            stack: 1,
            prefix: 1,
            favorited: true,
        };
        equipment.misc_hidden[3] = true;
        let mut storage = before.storage.clone();
        storage.void_vault[2] = ItemSlot {
            slot: 2,
            item_id: 3043,
            stack: 1,
            prefix: 0,
            favorited: true,
        };

        let patched = patch_document(
            &data,
            PatchDocument {
                character: &before.character,
                effects: &before.effects,
                journey: &before.journey,
                spawn_points: &before.spawn_points,
                inventory: &before.inventory,
                equipment: &equipment,
                storage: &storage,
            },
        )
        .unwrap();
        let after = parse(Path::new("fixture.plr"), "hash", &patched).unwrap();
        assert_eq!(after.equipment.loadouts[1].armor[0].item_id, 90);
        assert!(after.equipment.misc_hidden[3]);
        assert!(after.storage.void_vault[2].favorited);
        assert_eq!(read_i32(&patched, layout.loadouts).unwrap(), 200);
    }

    #[test]
    fn patches_complete_character_and_resizes_unicode_name_safely() {
        let data = synthetic_player("A");
        let before = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        let mut character = before.character.clone();
        character.name = "Forge测试".into();
        character.difficulty = 3;
        character.play_time_ticks = "9876543210".into();
        character.stats = CharacterStats {
            life: 475,
            life_max: 500,
            mana: 190,
            mana_max: 200,
        };
        character.appearance.hair = 227;
        character.appearance.hair_dye = 255;
        character.appearance.team = 5;
        character.appearance.skin_variant = 11;
        character.appearance.hair_color = RgbColor { r: 1, g: 2, b: 3 };
        character.appearance.skin_color = RgbColor { r: 4, g: 5, b: 6 };
        character.appearance.eye_color = RgbColor { r: 7, g: 8, b: 9 };
        character.appearance.shirt_color = RgbColor {
            r: 10,
            g: 11,
            b: 12,
        };
        character.appearance.under_shirt_color = RgbColor {
            r: 13,
            g: 14,
            b: 15,
        };
        character.appearance.pants_color = RgbColor {
            r: 16,
            g: 17,
            b: 18,
        };
        character.appearance.shoe_color = RgbColor {
            r: 19,
            g: 20,
            b: 21,
        };
        character.appearance.voice_variant = 4;
        character.appearance.voice_pitch = 0.75;
        character.upgrades = PermanentUpgrades {
            extra_accessory: true,
            unlocked_biome_torches: true,
            using_biome_torches: true,
            ate_artisan_bread: true,
            used_aegis_crystal: true,
            used_aegis_fruit: true,
            used_arcane_crystal: true,
            used_galaxy_pearl: true,
            used_gummy_worm: true,
            used_ambrosia: true,
            downed_dd2_event: true,
        };
        character.counters = CharacterCounters {
            tax_money: 250_000,
            pve_deaths: 123,
            pvp_deaths: 45,
        };

        let patched = patch_document(
            &data,
            PatchDocument {
                character: &character,
                effects: &before.effects,
                journey: &before.journey,
                spawn_points: &before.spawn_points,
                inventory: &before.inventory,
                equipment: &before.equipment,
                storage: &before.storage,
            },
        )
        .unwrap();
        let after = parse(Path::new("fixture.plr"), "hash", &patched).unwrap();
        assert_eq!(after.character, character);
        assert_eq!(after.inventory, before.inventory);
        assert_eq!(after.equipment, before.equipment);
        assert_eq!(after.storage, before.storage);
        assert_eq!(patched.len(), data.len() + "Forge测试".len() - 1);
    }

    #[test]
    fn rejects_character_values_terraria_would_clamp() {
        let data = synthetic_player("NewBruv");
        let document = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        let mut character = document.character.clone();
        character.appearance.hair = 228;
        assert!(validate_character(&character)
            .unwrap_err()
            .to_string()
            .contains("hair style"));

        character = document.character;
        character.stats.life_max = 501;
        assert!(validate_character(&character)
            .unwrap_err()
            .to_string()
            .contains("maximum health"));
    }

    #[test]
    fn equal_length_character_edit_only_mutates_mapped_regions() {
        let data = synthetic_player("NewBruv");
        let before = parse(Path::new("fixture.plr"), "hash", &data).unwrap();
        let original_layout = locate_layout(&data).unwrap();
        let mut character = before.character.clone();
        character.name = "ForgeMe".into();
        character.difficulty = 3;
        character.play_time_ticks = "123456789".into();
        character.stats.life = 499;
        character.appearance.hair = 42;
        character.appearance.team = 5;
        character.appearance.skin_variant = 9;
        character.appearance.hair_color = RgbColor {
            r: 100,
            g: 101,
            b: 102,
        };
        character.appearance.voice_variant = 4;
        character.appearance.voice_pitch = -0.5;
        character.upgrades.used_gummy_worm = true;
        character.counters.pvp_deaths = 17;

        let patched = patch_document(
            &data,
            PatchDocument {
                character: &character,
                effects: &before.effects,
                journey: &before.journey,
                spawn_points: &before.spawn_points,
                inventory: &before.inventory,
                equipment: &before.equipment,
                storage: &before.storage,
            },
        )
        .unwrap();
        assert_eq!(patched.len(), data.len());

        for index in 0..data.len() {
            let name = (METADATA_END..original_layout.name_end).contains(&index);
            let header = (original_layout.name_end..original_layout.name_end + 15).contains(&index)
                || (original_layout.name_end + 18..original_layout.name_end + HEADER_AFTER_NAME)
                    .contains(&index);
            let voice =
                (original_layout.voice_variant..original_layout.voice_pitch + 4).contains(&index);
            if data[index] != patched[index] {
                assert!(
                    name || header || voice,
                    "unexpected character mutation at byte {index}"
                );
            }
        }
    }

    #[test]
    fn patches_effects_spawns_research_and_journey_powers_without_losing_tail() {
        let mut data = synthetic_player("NewBruv");
        let original_layout = locate_layout(&data).unwrap();
        let tail_marker = original_layout.voice_pitch + 4;
        data[tail_marker..tail_marker + 4].copy_from_slice(&0x1234_5678u32.to_le_bytes());
        let before = parse(Path::new("fixture.plr"), "hash", &data).unwrap();

        let mut effects = before.effects.clone();
        effects.buffs[0] = BuffSlot {
            slot: 0,
            buff_id: 5,
            time: 3600,
        };
        let spawn_points = vec![
            SpawnPoint {
                x: 100,
                y: 200,
                world_id: 300,
                world_name: "Alpha".into(),
            },
            SpawnPoint {
                x: 400,
                y: 500,
                world_id: 600,
                world_name: "测试世界".into(),
            },
        ];
        let mut journey = before.journey.clone();
        journey.research = vec![
            ResearchEntry {
                persistent_id: "MagicLantern".into(),
                count: 9999,
            },
            ResearchEntry {
                persistent_id: "DrillContainmentUnit".into(),
                count: 1,
            },
        ];
        journey.serialized_power_ids = vec![5, 11, 14];
        journey.powers = JourneyPowers {
            godmode: true,
            far_placement_range: false,
            spawn_rate: 0.25,
        };
        journey.unlocked_super_cart = true;
        journey.enabled_super_cart = true;

        let patched = patch_document(
            &data,
            PatchDocument {
                character: &before.character,
                effects: &effects,
                journey: &journey,
                spawn_points: &spawn_points,
                inventory: &before.inventory,
                equipment: &before.equipment,
                storage: &before.storage,
            },
        )
        .unwrap();
        let after = parse(Path::new("fixture.plr"), "hash", &patched).unwrap();
        assert_eq!(after.effects, effects);
        assert_eq!(after.spawn_points, spawn_points);
        assert_eq!(after.journey, journey);
        assert_eq!(after.inventory, before.inventory);
        let new_layout = locate_layout(&patched).unwrap();
        assert_eq!(
            &patched[new_layout.voice_pitch + 4..new_layout.voice_pitch + 8],
            &0x1234_5678u32.to_le_bytes()
        );
    }
}
