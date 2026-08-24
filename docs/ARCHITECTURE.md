# Architecture

## Boundary

```text
React editor state
      │ typed invoke requests
      ▼
Tauri command boundary
      │ validated domain operations
      ▼
version registry → verified format codec → AES-CBC envelope → guarded filesystem transaction
```

The webview never receives encryption keys or raw decrypted payloads. It receives a normalized `PlayerDocument`, sends complete validated character, inventory, equipment, storage, effects, Journey, and spawn-point snapshots on save, and includes the source hash to prevent overwriting an externally changed file.

## Save engine

The current v279/v317/v325 codec family is intentionally bytes-preserving. A format descriptor models version-gated team, equipment-favorite, research-marker, and voice fields while sharing the verified inventory, storage, buff, spawn, Journey, and loadout machinery. Serialization splices only supported variable records and patches supported fixed records, relocating every dependent offset after each splice so untouched tail bytes remain exact. Variable-length .NET strings are safely re-encoded. Unknown Journey power payloads fail closed before a write is attempted.

Journey world powers are deliberately absent from the player domain: time, weather, and world-difficulty controls are world-file state. Player files serialize only Godmode (ID 5), extended placement range (ID 11), and the enemy spawn-rate slider (ID 14). The codec preserves which supported records were present and adds one only when that power is edited.

The version registry enables the verified v279, v317, and v325 codecs and rejects all other layouts. Each future codec must implement the same conceptual operations:

- inspect header and compatibility;
- parse into the normalized domain model;
- validate proposed changes;
- patch or serialize deterministically;
- verify the produced payload by parsing it again.

## Backup recovery

Backups live in a sibling `.plrforge-backups` directory. The native layer filters entries by the active player's exact file stem, decrypts and parses every listed file, and marks damaged or unsupported files unavailable. Both reveal and restore canonicalize the requested path and reject files outside that directory or belonging to a different character. Restore validates the selected backup, copies the current player to a millisecond-stamped `pre-restore` backup, verifies a staged copy, and only then replaces the player file. The editor reloads the restored document so its source hash and undo history cannot remain stale.

## Release discovery

Release discovery is notification-only. `PLRFORGE_GITHUB_REPOSITORY` is validated and embedded at compile time; official CI builds source it from GitHub's own `${{ github.repository }}` context. The native command calls GitHub's public latest-release endpoint over TLS, parses a SemVer tag, and constructs a release URL only under that configured repository. Opening arbitrary URLs is rejected. Automatic launch checks are an opt-in local browser preference.

The Tauri updater plugin is not enabled yet. Its installer flow requires a long-lived public/private updater key pair and signed update artifacts, in addition to platform code signing. Until those release identities are established, opening the human-readable GitHub Release is safer than implementing an unsigned or home-grown installer.

## Item data

Search metadata and save compatibility are separate concerns. Unknown but valid numeric IDs remain editable even when the friendly-name catalog lags a Terraria release. Bundled search data is replaceable; game assets are never required to open or save a character.

## Local asset adapter

PlrForge never ships or fetches Terraria artwork. A native Tauri command discovers a user-owned Steam/GOG installation (or accepts a folder chosen by the user), fingerprints the numeric `Item_*.xnb` and `Buff_*.xnb` sources, and decodes only XNA version-5 `Texture2DReader` color payloads. LZX frames, type readers, surface format, mip count, dimensions, and exact RGBA length are all validated before output.

The format implementation is grounded in the open-source [TExtract XNB extractor](https://github.com/Antag99/TExtract/blob/master/TExtract/src/com/github/antag99/textract/extract/XnbExtractor.java), uses the audited [`lzxd` Rust decoder](https://docs.rs/lzxd/latest/lzxd/), and follows Tauri's [scoped asset-protocol model](https://v2.tauri.app/security/asset-protocol/).

Animated item sheets are cropped by Terraria v325's exact registered frame rules, including the current `ItemID.Sets.IsFood` membership. Every frame retains Terraria's original transparent canvas because that padding encodes the intended relative item scale and alignment; pixels are never resampled or recolored. Shared React glyph viewports center, contain, and pixel-render the result across inventory, storage, inspector, search, Journey, and Item Catalog surfaces.

Extracted PNGs live below the OS application-cache directory. Tauri's asset protocol is enabled only for `$APPCACHE/terraria-assets/**/*`; original game resources and unrelated filesystem locations are never exposed to the webview. A completed versioned fingerprint is reused on later launches, while a changed installation or normalization version produces a new cache. Missing or invalid assets degrade to deterministic text glyphs and never block save editing.

## Local item metadata adapter

The bundled `PlrForge.Metadata.exe` helper is built from `metadata-helper/Program.cs` and embedded as a small managed executable. On macOS, PlrForge runs it through the MonoKickstart runtime already owned by the detected Terraria installation; Windows uses the operating system's .NET Framework loader. The helper loads the local `Terraria.exe`, resolves Terraria's embedded dependencies, sets a disposable save path, calls `Item.SetDefaults` for each current item ID, expands English localization references, and applies requested numeric prefixes without launching the game. Rust validates the schema and keeps base definitions plus keyed prefix variants inside the fingerprinted application cache. React receives only the validated records through Tauri commands. Extraction failure is isolated from icons and save editing.

## Testing strategy

- Rust unit tests cover 7-bit strings, variable-length Unicode names, dynamic v325 offsets, character validation, all character-field round trips, active/inactive loadout mapping, equipment stack validation, buff/spawn/research/Journey mutation, encryption and zero-padding round trips, untouched-tail assertions after multiple variable-length splices, strict XNB texture parsing, LZX decoding against locally installed real assets when available, animation-frame cropping, and Steam library-path parsing.
- Golden fixtures should be synthetic or explicitly user-approved and must never contain personal player files in source control.
- React tests cover the Character, Effects, Journey, Spawn Points, Backups, Settings, and Item Catalog workspaces, item search, category derivation, slot compatibility, catalog insertion, slot replacement, validation, restore confirmation, shared undo/redo, loading, empty, and error states.
- Native smoke tests load a copied fixture, change character, item, buff, spawn, research, Journey-power, and Super Cart regions, save it, re-open it, compare the complete normalized models, list the verified backup, restore it, and verify the pre-restore safety copy.

## Update response

When Terraria changes its format, PlrForge should fail closed with the detected version. Maintainers add a fixture and one codec adapter, then publish compatibility separately from UI changes. No heuristic scanning is allowed in the write path.
