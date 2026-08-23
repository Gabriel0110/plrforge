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
- **Inventory:** 50 main slots, coins, ammo, item ID, stack, prefix, favorite, move, replace, and clear.
- **Storage:** Piggy Bank, Safe, Defender's Forge, and Void Vault.
- **Effects:** saved buffs and durations.
- **Journey:** researched items and quantities, plus journey-only player powers when serialized in the player file.
- **Spawn points:** named bed spawn records.
- **Change ledger:** undo, redo, before/after inspection, and save transaction result.

Global command search finds both actions and items. An item can be added to the first compatible empty slot or assigned to an explicit slot. Equipment slots reject incompatible item categories once the local catalog adapter can resolve item capabilities.

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
- Locally extracted, user-owned item icons with a no-assets fallback.

The codec and editing work is complete. Local item-icon extraction remains an optional visual enhancement; the built-in no-assets glyph fallback is production-safe.

### Phase 3 — character systems (implemented)

- Identity, appearance colors, voice settings, difficulty, health/mana, permanent consumable upgrades, play time, tax savings, and death counters are implemented.
- All 44 saved buff slots, exact durations, and v325 buff-ID validation.
- Named spawn-point records with exact world IDs, names, and tile coordinates.
- Journey research tracker, individual/bulk completion, all three per-player powers, and independent Super Cart flags.
- Validation and serialization rules traced to the matching v325 game assembly, with unknown Journey power payloads rejected before writing.

### Phase 4 — compatibility and release (next)

- Golden fixtures for supported historical formats, beginning with 1.4.4 and 1.4.5.
- Unsigned preview builds, then Apple notarization and Windows code signing.
- Signed update manifest, crash-safe diagnostics, localization, accessibility pass, and stable 1.0.

## Definition of done for 1.0

- Feature parity for character editing on every supported desktop save version.
- Golden round-trip tests prove unchanged files retain identical decrypted payloads.
- Changed-field tests prove only expected byte ranges differ.
- Keyboard-only operation, screen-reader names, contrast compliance, reduced motion, and 1280×720 minimum layout.
- macOS universal binary and Windows x64 installer produced by CI.
- Notarized/signed artifacts, checksums, changelog, compatibility matrix, and recovery documentation.
