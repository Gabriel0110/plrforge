<div align="center">

# PlrForge (Player Forge)

### A modern, local-first Terraria character editor for macOS and Windows

[![Build](https://github.com/Gabriel0110/plrforge/actions/workflows/build.yml/badge.svg)](https://github.com/Gabriel0110/plrforge/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-5fcf9b.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/desktop-Tauri-24C8DB.svg)](https://tauri.app/)
[![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-8b96a5.svg)](#compatibility)

Edit Terraria player files with fast item search, a complete item catalog, native game icons and metadata, automatic backups, and verified saves.

[Download a build](https://github.com/Gabriel0110/plrforge/releases) · [View compatibility](docs/COMPATIBILITY.md) · [Report a bug](https://github.com/Gabriel0110/plrforge/issues/new) · [Contribute](CONTRIBUTING.md)

</div>

> [!IMPORTANT]
> Close Terraria before opening or saving a character. Steam Cloud or the running game can overwrite local changes.

PlrForge is an open-source editor for encrypted desktop Terraria `.plr` files. Everything runs locally: characters and extracted game data are never uploaded to a server. PlrForge edits player characters only—it does not modify worlds, console/mobile saves, server-side characters, or tModLoader `.tplr` files.

PlrForge is an independent community project and is not affiliated with or endorsed by Re-Logic.

## Features

| Area | What you can edit |
| --- | --- |
| **Character** | Name, difficulty, appearance, health, mana, play time, permanent upgrades, tax savings, death counters, team, and voice where supported by the file format |
| **Inventory** | All 58 carried slots, stack counts, favorite state, and a compatibility-aware modifier browser with live stat previews |
| **Equipment** | Three loadouts, armor, accessories, vanity slots, dyes, pets, light pets, minecarts, mounts, and hooks |
| **Storage** | Piggy Bank, Safe, Defender's Forge, and Void Vault |
| **Item Catalog** | Browse 6,170 items by category and rarity; search by name or numeric ID; sort and insert directly into a compatible slot |
| **Effects** | All 44 saved buff slots |
| **Journey Mode** | Research progress, Godmode, extended placement range, enemy spawn rate, and Super Cart flags |
| **Spawn Points** | View, add, edit, and remove named spawn records |

Additional quality-of-life features include:

- Native Terraria item and buff icons extracted from the user's own installation
- Detailed, prefix-aware item tooltips generated from the installed game
- Searchable modifier selection with item-type, quality, and stat-effect filters—including Terraria 1.4.5 summon modifiers
- Shared undo and redo history across the editor
- Automatic timestamped backups before every successful save
- Backup browsing and guarded restore inside the app
- Manual and opt-in launch-time update checks through GitHub Releases
- Keyboard-efficient slot grids, semantic controls, visible focus, reduced-motion support, and skip navigation
- Graceful text fallbacks when Terraria assets are unavailable

## Save safety

Every save passes through the native Rust layer and follows the same guarded transaction:

1. Confirm that the source file has not changed since it was opened.
2. Validate the character, items, buffs, spawn points, Journey data, stack rules, slot counts, and file version.
3. Create a timestamped copy in a sibling `.plrforge-backups` directory.
4. Write to a staged file, decrypt it again, and verify the plaintext payload.
5. Atomically replace the original file and report the backup location.

If something goes wrong, follow the [character recovery guide](docs/RECOVERY.md).

## Compatibility

PlrForge currently enables editing only for player-file layouts with dedicated regression coverage. Unknown and newer formats fail closed instead of risking a damaged character.

| Platform / format | Support |
| --- | --- |
| macOS, Apple silicon and Intel | Universal application bundle and DMG |
| Windows 10/11, x64 | MSI and NSIS installers |
| Terraria player format v279 | Verified |
| Terraria player formats v317, v325, and v326 | Verified |
| Other `.plr` versions | Detected, but editing remains disabled until verified |

See the [full compatibility matrix](docs/COMPATIBILITY.md) for format-specific details and exclusions.

## Getting started

1. Visit [GitHub Releases](https://github.com/Gabriel0110/plrforge/releases) and download the build for your platform. If no packaged build is available for the current revision, use the [development instructions](#development).
2. Fully close Terraria.
3. Start PlrForge and choose **Open Player**.
4. Select a `.plr` file, make your changes, and choose **Save changes**.
5. Reopen the character in PlrForge, then verify it in Terraria before removing any recovery copies.

Default player folders:

- **macOS:** `~/Library/Application Support/Terraria/Players`
- **Windows:** `%USERPROFILE%\Documents\My Games\Terraria\Players`

Official macOS release artifacts are Developer ID signed, Apple-notarized, and stapled for Gatekeeper verification. Windows installers are not yet code-signed and will show an unidentified-publisher warning. Review the release notes and checksum manifest before installing a preview.

## Local Terraria data

PlrForge does not bundle, download, or hotlink Terraria artwork or extracted game definitions. The desktop app discovers a local Steam or GOG installation and builds a private application cache from that copy of the game.

- `Item_*.xnb` and `Buff_*.xnb` textures are decoded into local PNG files without resampling, recoloring, or changing Terraria's transparent sprite canvas.
- A small open-source metadata helper reads the installed game's item defaults and English localization to provide damage, speed, knockback, tool power, healing, value, descriptive text, and exact prefix-adjusted values.
- Modifier compatibility and previews come from Terraria's own `CanRollPrefix` and prefix-stat calculations, so PlrForge filters for the selected item instead of guessing from a fixed list.
- Terraria is never launched or modified, and no game data is sent over the network.
- If extraction is unavailable or a game update changes the assembly layout, editing continues with the bundled searchable catalog and text fallbacks.

For a non-standard installation, use the game-data control in the app header and select the Terraria installation, `Content`, or `Images` folder.

## Why Tauri

PlrForge keeps the user interface and save-file engine behind a strict boundary:

```text
React + TypeScript editor
          │ validated commands
          ▼
Rust / Tauri native layer
          │
          ├── versioned .plr codecs
          ├── validation and encryption
          ├── verified backup/save transaction
          └── local icon and metadata adapters
```

Tauri provides a lightweight native application using the operating system's webview, while Rust owns all file access, decryption, validation, backup, and write operations. The same codebase produces universal macOS bundles and Windows installers.

## Development

### Prerequisites

- [Node.js 22](https://nodejs.org/)
- [Rust stable](https://rustup.rs/)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) for the metadata helper
- The platform dependencies in the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

### Run the desktop app

```sh
git clone https://github.com/Gabriel0110/plrforge.git
cd plrforge
npm ci
npm run metadata:build
npm run desktop:dev
```

The browser-only preview uses a disposable demo character and cannot access native `.plr` files:

```sh
npm run dev
```

### Test and build

```sh
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run desktop:build
```

An optional real-format regression test can run against a disposable copy of a supported player file. The test copies the fixture into a temporary directory before writing; never use a live Steam Cloud character or commit a personal `.plr` file.

```sh
PLRFORGE_FIXTURE=/absolute/path/to/disposable.plr \
  cargo test --manifest-path src-tauri/Cargo.toml external_fixture -- --nocapture
```

## Project documentation

- [Accessibility](docs/ACCESSIBILITY.md) — keyboard behavior, native semantic verification, and screen-reader release checks
- [Architecture](docs/ARCHITECTURE.md) — application boundaries, codecs, save transactions, local asset handling, and testing strategy
- [Compatibility](docs/COMPATIBILITY.md) — supported player-file versions and fail-closed behavior
- [Recovery](docs/RECOVERY.md) — in-app and manual character restoration
- [Release guide](docs/RELEASE.md) — packaging, validation, checksums, and preview publication
- [Contributing](CONTRIBUTING.md) — local setup, testing expectations, and pull-request guidance

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before making a change. Save-format changes require focused tests and must preserve PlrForge's fail-closed behavior.

When reporting a character-file issue, include the detected file version and application error message, but **do not attach a personal `.plr` file publicly**.

## Data and licensing

PlrForge is available under the [MIT License](LICENSE).

The bundled fallback item and buff metadata is licensed under the Microsoft Public License and is derived in part from the [TEdit](https://github.com/TEdit/Terraria-Map-Editor) project. See [THIRD_PARTY_MS-PL.txt](THIRD_PARTY_MS-PL.txt) for attribution. Terraria and its artwork are owned by Re-Logic.
