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

The webview never receives encryption keys or raw decrypted payloads. It receives a normalized `PlayerDocument`, sends complete validated character, inventory, equipment, and storage snapshots on save, and includes the source hash to prevent overwriting an externally changed file.

## Save engine

The current v325 codec is intentionally bytes-preserving. It maps the complete serialized character header, locates the fixed inventory/equipment/storage blocks, and traverses the versioned variable-length tail to the three serialized loadouts and voice fields. Serialization patches only supported character, item, and visibility records, so unsupported tail fields are preserved exactly. Variable-length .NET names are safely re-encoded before all dependent offsets are relocated. Unknown Journey power payloads fail closed before a write is attempted.

The version registry rejects anything other than 325 today. Each future codec must implement the same conceptual operations:

- inspect header and compatibility;
- parse into the normalized domain model;
- validate proposed changes;
- patch or serialize deterministically;
- verify the produced payload by parsing it again.

## Item data

Search metadata and save compatibility are separate concerns. Unknown but valid numeric IDs remain editable even when the friendly-name catalog lags a Terraria release. Bundled search data is replaceable; game assets are never required to open or save a character.

## Testing strategy

- Rust unit tests cover 7-bit strings, variable-length Unicode names, dynamic v325 offsets, character validation, all character-field round trips, active/inactive loadout mapping, equipment stack validation, encryption and zero-padding round trips, and mutation-range assertions.
- Golden fixtures should be synthetic or explicitly user-approved and must never contain personal player files in source control.
- React tests cover the Character workspace, item search, slot replacement, validation, shared undo/redo, loading, empty, and error states.
- Native smoke tests load a copied fixture, change character and item regions, save it, re-open it, and compare the complete normalized models.

## Update response

When Terraria changes its format, PlrForge should fail closed with the detected version. Maintainers add a fixture and one codec adapter, then publish compatibility separately from UI changes. No heuristic scanning is allowed in the write path.
