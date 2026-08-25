# Release checklist

## Local quality gate

- `npm run build`
- `npm run test`
- `node script/release.mjs verify --expected <version>`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- Run `PLRFORGE_FIXTURE=/absolute/path/to/a/disposable.plr cargo test --manifest-path src-tauri/Cargo.toml external_fixture -- --nocapture` once each with v279, v317, v325, and v326 fixtures.
- Confirm the external fixture's no-edit save and generated backup are byte-identical to the encrypted source.
- Confirm verified v279/v317/v325/v326 files appear as **Verified**, other historical fixture-gated files appear as **Needs fixture**, newer files appear as **Update needed**, and only verified files can enter the editor.
- Load, modify, save, and re-open a disposable v326 character copy.
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
- Complete the platform screen-reader checklist in `docs/ACCESSIBILITY.md` against a disposable player copy.

## macOS

- Build universal Apple Silicon + Intel app and DMG artifacts.
- For unsigned previews, keep Tauri's ad-hoc `signingIdentity: "-"`; confirm macOS still requires explicit user approval in Privacy & Security.
- Configure Developer ID Application signing.
- Notarize and staple the `.app`/`.dmg`.
- Validate preview bundles with `node script/macos-artifact.mjs <PlrForge.app> --mode preview --expect-arch arm64,x86_64`.
- Validate stable bundles with `node script/macos-artifact.mjs <PlrForge.app> --mode distribution --expect-arch arm64,x86_64 --dmg <PlrForge.dmg>`; this rejects ad-hoc signatures and requires Gatekeeper acceptance plus stapled notarization tickets.
- Test first launch, file picker permissions, backup access, and Steam Cloud warning.
- Test Steam and nonstandard game-asset paths on both a clean and populated icon cache.

## Windows

- Build x64 MSI and NSIS installer in GitHub Actions.
- For unsigned previews, confirm both installer types clearly show the expected unidentified-publisher warning.
- Sign executables and installers with an EV/OV certificate or trusted signing service.
- Test WebView2 bootstrap, Documents discovery, non-ASCII usernames, and locked save files.
- Test default/secondary Steam libraries, GOG paths, folder selection, and asset-protocol PNG display.

## Preview release

- Keep `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` on the same SemVer.
- Run **Release preview** manually and enter that exact version without a leading `v`.
- The workflow runs the complete quality gate before creating `v<version>` from the selected commit.
- Confirm the draft contains a universal macOS `.app.tar.gz` and `.dmg`, a Windows `.msi` and NSIS `.exe`, `SHA256SUMS.txt`, `COMPATIBILITY.md`, and `RECOVERY.md`.
- Download each bundle, verify it against `SHA256SUMS.txt`, and complete the macOS and Windows smoke tests above.
- Keep the release as a draft until review is complete. If published for testers, keep it marked as a prerelease; the app can discover public previews but the release page and notes must identify their unsigned status clearly.
- Do not enable Tauri updater metadata or `.sig` generation for unsigned previews.

## Stable public release

- Keep `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` on the same SemVer and tag it as `v<version>`.
- Official builds use `Gabriel0110/plrforge` as the update feed by default. Forks can override it with `PLRFORGE_GITHUB_REPOSITORY=owner/repository`; GitHub Actions supplies `${{ github.repository }}` automatically.
- Publish a non-draft, non-prerelease GitHub Release so the stable update check can discover it.
- Promote only identity-signed/notarized artifacts that have passed the preview checklist; do not relabel unsigned preview binaries as stable.
- Publish SHA-256 checksums, the compatibility matrix, and recovery instructions.
- Link recovery instructions prominently.
- Credit TEdit item metadata under MS-PL.
- State that Terraria and its assets are owned by Re-Logic and are not distributed.
- Never claim affiliation with Terrasavr, TEdit, or Re-Logic.

## Signed installer updates (after signing setup)

- Generate the permanent Tauri updater key once, store the private key and password only as protected repository secrets, and commit only the public key.
- Enable updater artifacts and the official Tauri updater plugin only after macOS notarization and Windows signing work in CI.
- Publish and verify `latest.json`, platform artifacts, and `.sig` files from a private test release before enabling installation for users.
- Never replace Tauri signature verification with a custom download/install path.

## Release identity prerequisites

- **Apple:** an Apple Developer Program team, a `Developer ID Application` certificate, and either App Store Connect API credentials (`APPLE_API_ISSUER`, `APPLE_API_KEY`, and the private key supplied at `APPLE_API_KEY_PATH`) or Apple ID notarization credentials. CI must import the certificate securely and provide `APPLE_SIGNING_IDENTITY`; no certificate or private key belongs in git. Follow [Tauri's macOS signing and notarization guide](https://v2.tauri.app/distribute/sign/macos/).
- **Windows:** choose a single provider before changing the workflow. Tauri supports a certificate in the Windows certificate store, a custom signing command, Azure Key Vault, and Azure Artifact Signing. The account/profile identifiers may be configuration, but every private key, password, client secret, or signing token belongs in protected CI secrets. Follow [Tauri's Windows signing guide](https://v2.tauri.app/distribute/sign/windows/).
- **Updater:** generate the long-lived Tauri updater key only after both platform signatures are operational. Store `TAURI_SIGNING_PRIVATE_KEY` and its password as protected secrets, commit only the public key, and retain an offline recovery copy; losing the private key prevents publishing trusted updates to existing installations. Follow the [official updater signing requirements](https://v2.tauri.app/plugin/updater/); update signatures cannot be disabled.
