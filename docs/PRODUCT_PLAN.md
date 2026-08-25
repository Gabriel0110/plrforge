# Product plan

## Product contract

PlrForge is a local, offline, character-only save editor. It covers every character field Terrasavr exposes without copying Terrasavr's interface. World editing, server-side characters, console/mobile saves, cloud APIs, account systems, and online item spawning are outside the product boundary.

The application optimizes for three jobs:

1. Open the correct player confidently.
2. Find and change any character value with minimal navigation.
3. Save without losing the previous working file.

## Information architecture

- **Character:** identity, difficulty, health, mana, appearance, permanent upgrades, death counts, and play time.
- **Loadouts:** armor, accessories, vanity, dyes, pets, light pets, hooks, mounts, and minecarts across all three loadouts.
- **Inventory:** 50 main slots, coins, ammo, item ID, stack, favorite, move, replace, clear, and a searchable modifier browser with compatibility, item-family, quality, and stat-effect filters.
- **Item Catalog:** browse every known item by category and rarity, search by name/key/ID, sort, restrict to the active destination's compatible items, and insert without leaving the browsing workflow.
- **Storage:** Piggy Bank, Safe, Defender's Forge, and Void Vault.
- **Effects:** saved buffs and durations.
- **Journey:** researched items and quantities, plus journey-only player powers when serialized in the player file.
- **Spawn points:** named bed spawn records.
- **Backups:** verified per-character history, reveal, guarded restore, and pre-restore safety copies.
- **Settings:** local game-art source and manual/opt-in GitHub Release checks.
- **Change ledger:** undo, redo, before/after inspection, and save transaction result.

The quick search beside every item surface supports direct name/ID entry or hands the current destination to the full Item Catalog. Equipment slots keep incompatible catalog entries visible for discovery but disable insertion; the compatibility-only filter removes them when a focused choice is needed.

## Safety and trust

- Read-only compatibility check before the editor opens.
- Explicit supported/untested/unsupported version state.
- Hash-based external-change detection.
- No hidden replacement of occupied slots.
- Automatic timestamped backup on every save.
- Staged encryption round-trip before replacement.
- Error messages keep both the original and staged file recoverable.
- Diagnostics redact the home-directory prefix by default.

## Delivery phases

### Phase 0 — format proof (complete)

- Confirm AES-128-CBC key/IV behavior against a live v325 file.
- Identify the v322 armor/dye favorite flags and v324 boolean that moved inventory offsets.
- Patch and round-trip a real v325 character successfully in Terraria.

### Phase 1 — safe inventory vertical slice (implemented in this repository)

- macOS/Windows player discovery and native `.plr` picker.
- v325 identity, core stats, and all 58 inventory records.
- Search by item name or numeric ID.
- Stack, prefix, favorite, replace, remove, undo, and redo.
- Hash guard, backup, staged write, decrypt verification, and reload.
- Demo-mode web build and Rust/React tests.

### Phase 2 — full item surfaces (implemented)

- All loadouts, vanity, dyes, misc equipment, and four storage banks.
- Slot compatibility from current item metadata.
- Cross-surface copy, move, safe swap, and keyboard-accessible controls.
- Automatic Steam/GOG discovery and locally extracted, user-owned item and buff icons with a no-assets fallback.
- Strict XNB/LZX decoding, fingerprinted OS cache, exact v325 animation-frame normalization, and a manual folder picker.
- Transparent-edge normalization, bounded pixel-art viewports, a compact inventory layout with a distinct hotbar, and a reusable full Item Catalog with category/rarity/sort/compatibility controls.
- Prefix selection now queries the installed Terraria build for every candidate's roll compatibility and exact stat multipliers, then exposes positive, tradeoff, negative, item-family, and effect filters with resulting-stat previews.

The codec, editing work, and optional local icon adapter are complete. The built-in no-assets glyph fallback remains production-safe.

### Phase 3 — character systems (implemented)

- Identity, appearance colors, voice settings, difficulty, health/mana, permanent consumable upgrades, play time, tax savings, and death counters are implemented.
- All 44 saved buff slots, exact durations, and v325 buff-ID validation.
- Named spawn-point records with exact world IDs, names, and tile coordinates.
- Journey research tracker, individual/bulk completion, all three per-player powers, and independent Super Cart flags.
- Validation and serialization rules traced to the matching v325 game assembly, with unknown Journey power payloads rejected before writing.

### Phase 4 — compatibility and release (in progress)

- A centralized codec registry now classifies v279, v317, v325, and v326 as verified, other historical versions as fixture-gated, and newer versions as unsupported without attempting a speculative parse.
- The v279 codec accounts for the absent team byte, pre-v282 research block, derived voice, and absent voice-pitch field while retaining the 1.4.4-era loadout and Journey systems.
- The v317 codec accounts for the pre-v322 equipment records without favorite bytes and the pre-v324 character header, and passes the same complete mutation and byte-identical no-op suite as v325.
- Player discovery and file opening expose the same supported/untested/unsupported decision, and unsupported files remain fail-closed with an actionable explanation.
- The opt-in external v279/v317/v325/v326 fixture suite proves that a no-edit save reproduces the exact encrypted source bytes and preserves the exact backup bytes.
- Golden fixtures for supported historical formats, beginning with 1.4.4 and 1.4.5.
- The manual preview pipeline now gates on tests, formatting, linting, and matching SemVer manifests; builds universal macOS DMG/app plus Windows MSI/NSIS artifacts; uses a macOS ad-hoc signature; validates all four bundle types; and attaches deterministic SHA-256 checksums, compatibility, and recovery documents to a draft prerelease.
- Apple Developer ID signing/notarization and Windows code signing follow after preview testing.
- Manual and opt-in GitHub Release discovery is implemented; signed download/install remains gated on a protected updater key and platform signing identities.
- The keyboard-accessibility foundation now includes skip navigation, one-tab-stop item grids with arrow-key movement, semantic tabs/radios/comboboxes, live status announcements, reduced-motion support, a verified 1280×720 layout, and a packaged macOS Accessibility API audit. Manual VoiceOver speech-output and Windows NVDA passes remain before release.
- Signed update manifest, crash-safe diagnostics, localization, native screen-reader validation, and stable 1.0.

## Definition of done for 1.0

- Feature parity for character editing on every supported desktop save version.
- Golden round-trip tests prove unchanged files retain identical decrypted payloads.
- Changed-field tests prove only expected byte ranges differ.
- Keyboard-only operation, screen-reader names, contrast compliance, reduced motion, and 1280×720 minimum layout.
- macOS universal binary and Windows x64 installer produced by CI.
- Notarized/signed artifacts, checksums, changelog, compatibility matrix, and recovery documentation.
