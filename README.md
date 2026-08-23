# PlrForge

PlrForge is an open-source, local-first Terraria character editor for macOS and Windows. It is an independent project and is not affiliated with or endorsed by Re-Logic.

The current build loads encrypted desktop `.plr` files at versions 317 and 325 and edits character identity, difficulty, play time, health/mana, appearance and voice, permanent upgrades, tax savings, death counters, and every item-bearing surface. That includes the 58 inventory slots, three equipment loadouts, vanity and dyes, pets/mounts/hooks, and four personal storage containers. It also edits all 44 saved buff records, named spawn points, Journey research, the three per-player Journey powers, and both Super Cart flags. Every surface shares one undo history and guarded backup-and-verify save transaction. A centralized compatibility registry keeps other historical, unverified, and newer player formats out of the editor until their own golden fixtures pass.

## Why Tauri

- Rust owns decryption, parsing, validation, backups, and writes.
- React and TypeScript provide a fast, searchable desktop editor.
- The shipped app uses the operating system webview instead of bundling Chromium.
- The same source produces macOS application bundles and Windows installers.

## Development

Prerequisites: Node.js 20+, Rust stable, and the platform requirements from the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) guide.

```sh
npm install --cache /private/tmp/plrforge-npm-cache
npm run dev
npm run test
npm run desktop:dev
```

The browser build opens a safe demo character. Native file access is available only inside Tauri.

To run the optional real-format regression suite against a disposable v317 or v325 player copy, set `PLRFORGE_FIXTURE` to its absolute path. The tests copy it into a temporary directory before writing and prove that a no-edit save and its backup remain byte-identical to the encrypted source:

```sh
PLRFORGE_FIXTURE=/absolute/path/to/disposable.plr cargo test --manifest-path src-tauri/Cargo.toml external_fixture -- --nocapture
```

Never point release automation at a live Steam Cloud character or commit `.plr` fixtures. Sanitized format evidence remains local until a redistribution-safe fixture is available.

## Local game icons

The desktop app automatically looks for Steam/GOG Terraria installations in standard macOS, Windows, and Linux locations. When found, it reads only `Content/Images/Item_*.xnb` and `Buff_*.xnb`, strictly decodes XNA color textures, selects Terraria's first inventory frame for animated items, and writes regular PNGs to PlrForge's private application cache. The first extraction currently prepares 6,134 item icons and 400 buff icons from Terraria v325; later launches reuse the fingerprinted cache.

If Terraria is installed somewhere unusual, use the game-icons control in the header and choose the Terraria install, `Content`, or `Images` folder. Icons are optional: loading and editing remain fully functional with the built-in text glyphs.

## Save safety

PlrForge never mutates a loaded file in memory without tracking the change. Before saving it:

1. Checks that the file still matches the hash that was originally loaded.
2. Validates every editable character field, item surface, buff, spawn record, Journey record, slot count, stack rule, and supported file version.
3. Creates a timestamped copy in a sibling `.plrforge-backups` directory.
4. Writes and decrypts a staged file to verify byte-for-byte plaintext integrity.
5. Replaces the original and reports the recoverable backup path.

Do not edit a character while Terraria is running. Steam Cloud can otherwise race the local save.

The **Backups** workspace lists only the active character's verified backups. Restoring is disabled while the editor has unsaved changes, requires a second confirmation, and preserves the current `.plr` as a new `pre-restore` backup before replacement. **Reveal** opens the containing folder without exposing arbitrary paths to the webview.

## Release checks

The app header and **Settings** workspace both provide a manual update check, while Settings also contains an opt-in “check automatically on launch” preference. Official GitHub Actions builds compile their source repository into the app via `PLRFORGE_GITHUB_REPOSITORY=${{ github.repository }}`. The app asks GitHub's public `releases/latest` endpoint for metadata, compares semantic versions, and can open the matching release page. It does not download or install code. Local builds without a configured repository report that update checks are unavailable instead of guessing a feed.

To configure a local or third-party build:

```sh
PLRFORGE_GITHUB_REPOSITORY=owner/repository npm run desktop:build
```

Published release tags must be semantic versions such as `v0.2.0`, and the versions in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` must agree. A signed in-app installer is intentionally deferred until the project has permanent macOS/Windows signing identities and a protected Tauri updater key.

## Data and licensing

The searchable item and buff metadata is distributed under the Microsoft Public License and derived in part from the TEdit project. See `THIRD_PARTY_MS-PL.txt`. PlrForge does not bundle, download, or hotlink Terraria sprites or other game assets. Its optional asset adapter creates a disposable local cache from the user's own installed copy. Terraria and its artwork are owned by Re-Logic.

## Status

See [Product plan](docs/PRODUCT_PLAN.md), [architecture](docs/ARCHITECTURE.md), and [release checklist](docs/RELEASE.md).

The project also includes a one-command macOS run loop at `script/build_and_run.sh` and a Codex `Run` action in `.codex/environments/environment.toml`.
