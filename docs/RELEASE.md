# Release checklist

## Local quality gate

- `npm run build`
- `npm run test`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- Run `PLRFORGE_FIXTURE=/absolute/path/to/a/disposable.plr cargo test --manifest-path src-tauri/Cargo.toml external_fixture -- --nocapture` once each with v279, v317, and v325 fixtures.
- Confirm the external fixture's no-edit save and generated backup are byte-identical to the encrypted source.
- Confirm verified v279/v317/v325 files appear as **Verified**, other historical fixture-gated files appear as **Needs fixture**, newer files appear as **Update needed**, and only verified files can enter the editor.
- Load, modify, save, and re-open a disposable v325 character copy.
- Exercise inventory-to-storage copy/move and active/inactive loadout edits on a disposable copy.
- Exercise a variable-length name, stats, appearance color, voice, permanent-upgrade, and death-counter edit on a disposable copy.
- Exercise saved-buff add/remove and duration changes on a disposable copy.
- Exercise variable-length spawn and research lists, all three per-player Journey powers, and both Super Cart bits on a disposable copy.
- Verify standard-path game-asset discovery, first-run extraction, cached relaunch, manual folder selection, and no-install glyph fallback.
- Confirm animated items show one inventory frame and item/buff icons render through the packaged asset protocol.
- `npx -y react-doctor@latest . --verbose --scope changed`
- Confirm the backup opens and the original source hash changes only after save.
- Verify backup listing, Reveal, unsaved-change lockout, restore confirmation, restored-file reload, and the new pre-restore safety copy.
- Verify manual release checking, opt-in launch checking, no-release/error states, and that release links cannot leave the configured GitHub repository.
- Verify 1280×720, 1440×900, and Windows high-DPI layouts.

## macOS

- Build universal Apple Silicon + Intel artifacts.
- Configure Developer ID Application signing.
- Notarize and staple the `.app`/`.dmg`.
- Test first launch, file picker permissions, backup access, and Steam Cloud warning.
- Test Steam and nonstandard game-asset paths on both a clean and populated icon cache.

## Windows

- Build x64 MSI and NSIS installer in GitHub Actions.
- Sign executables and installers with an EV/OV certificate or trusted signing service.
- Test WebView2 bootstrap, Documents discovery, non-ASCII usernames, and locked save files.
- Test default/secondary Steam libraries, GOG paths, folder selection, and asset-protocol PNG display.

## Public release

- Keep `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` on the same SemVer and tag it as `v<version>`.
- Build distributed binaries with `PLRFORGE_GITHUB_REPOSITORY=owner/repository`; the GitHub Actions build does this from `${{ github.repository }}`.
- Publish a non-draft, non-prerelease GitHub Release so the stable update check can discover it.
- Run the **Release draft** workflow to create the `v<version>` draft and attach universal macOS plus Windows artifacts; review its notes and assets before publishing it.
- Publish SHA-256 checksums and a compatibility matrix.
- Link recovery instructions prominently.
- Credit TEdit item metadata under MS-PL.
- State that Terraria and its assets are owned by Re-Logic and are not distributed.
- Never claim affiliation with Terrasavr, TEdit, or Re-Logic.

## Signed installer updates (after signing setup)

- Generate the permanent Tauri updater key once, store the private key and password only as protected repository secrets, and commit only the public key.
- Enable updater artifacts and the official Tauri updater plugin only after macOS notarization and Windows signing work in CI.
- Publish and verify `latest.json`, platform artifacts, and `.sig` files from a private test release before enabling installation for users.
- Never replace Tauri signature verification with a custom download/install path.
