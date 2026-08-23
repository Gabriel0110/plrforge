# Architecture

## Boundary

```text
React editor state
      │ typed invoke requests
      ▼
Tauri command boundary
      │ validated domain operations
      ▼
version registry → v325 codec → AES-CBC envelope → guarded filesystem transaction
```

The webview never receives encryption keys or raw decrypted payloads. It receives a normalized `PlayerDocument`, sends complete validated character, inventory, equipment, storage, effects, Journey, and spawn-point snapshots on save, and includes the source hash to prevent overwriting an externally changed file.

## Save engine

The current v325 codec is intentionally bytes-preserving. It maps the complete serialized character header, fixed inventory/equipment/storage and 44-record buff blocks, then traverses variable-length spawn, research, Journey-power, loadout, and voice regions. Serialization splices only supported variable records and patches supported fixed records, relocating every dependent offset after each splice so untouched tail bytes remain exact. Variable-length .NET strings are safely re-encoded. Unknown Journey power payloads fail closed before a write is attempted.

Journey world powers are deliberately absent from the player domain: time, weather, and world-difficulty controls are world-file state. Player files serialize only Godmode (ID 5), extended placement range (ID 11), and the enemy spawn-rate slider (ID 14). The codec preserves which supported records were present and adds one only when that power is edited.

The version registry rejects anything other than 325 today. Each future codec must implement the same conceptual operations:

- inspect header and compatibility;
- parse into the normalized domain model;
- validate proposed changes;
- patch or serialize deterministically;
- verify the produced payload by parsing it again.

## Item data

Search metadata and save compatibility are separate concerns. Unknown but valid numeric IDs remain editable even when the friendly-name catalog lags a Terraria release. Bundled search data is replaceable; game assets are never required to open or save a character.

## Testing strategy

- Rust unit tests cover 7-bit strings, variable-length Unicode names, dynamic v325 offsets, character validation, all character-field round trips, active/inactive loadout mapping, equipment stack validation, buff/spawn/research/Journey mutation, encryption and zero-padding round trips, and untouched-tail assertions after multiple variable-length splices.
- Golden fixtures should be synthetic or explicitly user-approved and must never contain personal player files in source control.
- React tests cover the Character, Effects, Journey, and Spawn Points workspaces, item search, slot replacement, validation, shared undo/redo, loading, empty, and error states.
- Native smoke tests load a copied fixture, change character, item, buff, spawn, research, Journey-power, and Super Cart regions, save it, re-open it, and compare the complete normalized models.

## Update response

When Terraria changes its format, PlrForge should fail closed with the detected version. Maintainers add a fixture and one codec adapter, then publish compatibility separately from UI changes. No heuristic scanning is allowed in the write path.
