# PlrForge

PlrForge is an open-source, local-first Terraria character editor for macOS and Windows. It is an independent project and is not affiliated with or endorsed by Re-Logic.

The current build loads encrypted desktop `.plr` files at version 325 and edits all item-bearing character surfaces: the 58 inventory slots, three equipment loadouts, vanity and dyes, pets/mounts/hooks, and four personal storage containers. Every surface shares one undo history and guarded backup-and-verify save transaction. Character stats, buffs, research, and spawn-point writes remain fail-closed roadmap work.

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

## Save safety

PlrForge never mutates a loaded file in memory without tracking the change. Before saving it:

1. Checks that the file still matches the hash that was originally loaded.
2. Validates every editable item surface, slot count, stack rule, and supported file version.
3. Creates a timestamped copy in a sibling `.plrforge-backups` directory.
4. Writes and decrypts a staged file to verify byte-for-byte plaintext integrity.
5. Replaces the original and reports the recoverable backup path.

Do not edit a character while Terraria is running. Steam Cloud can otherwise race the local save.

## Data and licensing

The initial searchable item metadata is distributed under the Microsoft Public License and derived from the TEdit project. See `THIRD_PARTY_MS-PL.txt`. PlrForge does not bundle Terraria sprites or other game assets. A future local asset adapter can read user-owned resources from an installed copy of Terraria.

## Status

See [Product plan](docs/PRODUCT_PLAN.md), [architecture](docs/ARCHITECTURE.md), and [release checklist](docs/RELEASE.md).

The project also includes a one-command macOS run loop at `script/build_and_run.sh` and a Codex `Run` action in `.codex/environments/environment.toml`.
