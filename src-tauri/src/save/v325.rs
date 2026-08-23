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
    pub name: String,
    pub difficulty: u8,
    pub play_time_ticks: String,
    pub core_stats: CoreStats,
    pub inventory: Vec<ItemSlot>,
    pub equipment: EquipmentDocument,
    pub storage: StorageDocument,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreStats {
    pub life: i32,
    pub life_max: i32,
    pub mana: i32,
    pub mana_max: i32,
    pub hair: i32,
    pub hair_dye: u8,
    pub team: u8,
    pub skin_variant: u8,
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
    current_loadout_index: usize,
    loadouts: usize,
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
    cursor += 4;
    let hair_dye = read_u8(data, cursor)?;
    cursor += 1;
    let team = read_u8(data, cursor)?;
    cursor += 3;
    let skin_variant = read_u8(data, cursor)?;
    cursor += 1;
    let life = read_i32(data, cursor)?;
    cursor += 4;
    let life_max = read_i32(data, cursor)?;
    cursor += 4;
    let mana = read_i32(data, cursor)?;
    cursor += 4;
    let mana_max = read_i32(data, cursor)?;

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

    Ok(PlayerDocument {
        path: path.to_string_lossy().into_owned(),
        source_hash: source_hash.into(),
        version,
        name,
        difficulty,
        play_time_ticks: play_time_ticks.to_string(),
        core_stats: CoreStats {
            life,
            life_max,
            mana,
            mana_max,
            hair,
            hair_dye,
            team,
            skin_variant,
        },
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

pub fn validate_document(
    inventory: &[ItemSlot],
    equipment: &EquipmentDocument,
    storage: &StorageDocument,
) -> Result<(), SaveError> {
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

pub fn patch_document(
    data: &[u8],
    inventory: &[ItemSlot],
    equipment: &EquipmentDocument,
    storage: &StorageDocument,
) -> Result<Vec<u8>, SaveError> {
    validate_document(inventory, equipment, storage)?;
    let layout = locate_layout(data)?;
    let original_index = read_i32(data, layout.current_loadout_index)?;
    if original_index != equipment.current_loadout_index as i32 {
        return Err(SaveError::Validation(
            "changing the active loadout is not enabled yet; switch it in Terraria and reload the file".into(),
        ));
    }

    let mut patched = data.to_vec();
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
    let mut cursor = bank4 + BANK_RECORDS * INVENTORY_RECORD_SIZE + 1;
    cursor = checked_advance(data, cursor, BUFF_RECORDS * BUFF_RECORD_SIZE)?;

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

    cursor = checked_advance(data, cursor, 1 + 13 + 4 + 4 * 4 + 12 * 4 + 4)?;
    let dead = read_u8(data, cursor)? != 0;
    cursor += 1;
    if dead {
        cursor = checked_advance(data, cursor, 4)?;
    }
    cursor = checked_advance(data, cursor, 8 + 4)?;

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

    let temporary_slots = read_u8(data, cursor)?;
    cursor += 1;
    for bit in 0..4 {
        if temporary_slots & (1 << bit) != 0 {
            cursor = checked_advance(data, cursor, BANK_RECORD_SIZE)?;
        }
    }

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

    cursor = checked_advance(data, cursor, 1)?;
    let current_loadout_index = cursor;
    cursor = checked_advance(data, cursor, 4)?;
    let loadouts = cursor;
    checked_advance(data, loadouts, LOADOUT_RECORDS * LOADOUT_SIZE)?;

    Ok(Layout {
        name_end,
        armor,
        dyes,
        inventory,
        misc,
        banks: [bank1, bank2, bank3, bank4],
        current_loadout_index,
        loadouts,
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

        let patched = patch_document(&data, &inventory, &equipment, &storage).unwrap();
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
        let error =
            validate_document(&document.inventory, &equipment, &document.storage).unwrap_err();
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

        let patched = patch_document(&data, &before.inventory, &equipment, &storage).unwrap();
        let after = parse(Path::new("fixture.plr"), "hash", &patched).unwrap();
        assert_eq!(after.equipment.loadouts[1].armor[0].item_id, 90);
        assert!(after.equipment.misc_hidden[3]);
        assert!(after.storage.void_vault[2].favorited);
        assert_eq!(read_i32(&patched, layout.loadouts).unwrap(), 200);
    }
}
