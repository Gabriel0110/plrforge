# Release checklist

## Local quality gate

- `npm run build`
- `npm run test`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- Load, modify, save, and re-open a disposable v325 character copy.
- Exercise inventory-to-storage copy/move and active/inactive loadout edits on a disposable copy.
- Exercise a variable-length name, stats, appearance color, voice, permanent-upgrade, and death-counter edit on a disposable copy.
- `npx -y react-doctor@latest . --verbose --scope changed`
- Confirm the backup opens and the original source hash changes only after save.
- Verify 1280×720, 1440×900, and Windows high-DPI layouts.

## macOS

- Build universal Apple Silicon + Intel artifacts.
- Configure Developer ID Application signing.
- Notarize and staple the `.app`/`.dmg`.
- Test first launch, file picker permissions, backup access, and Steam Cloud warning.

## Windows

- Build x64 MSI and NSIS installer in GitHub Actions.
- Sign executables and installers with an EV/OV certificate or trusted signing service.
- Test WebView2 bootstrap, Documents discovery, non-ASCII usernames, and locked save files.

## Public release

- Publish SHA-256 checksums and a compatibility matrix.
- Link recovery instructions prominently.
- Credit TEdit item metadata under MS-PL.
- State that Terraria and its assets are owned by Re-Logic and are not distributed.
- Never claim affiliation with Terrasavr, TEdit, or Re-Logic.
