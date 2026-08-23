# Design QA

## Artifacts

- Generated target: `docs/editor-concept.png`
- Browser implementation capture: `docs/implementation-1440x900.png`
- Capture method: Codex in-app browser at an explicit 1440×900 viewport
- Native check: packaged `PlrForge.app` inspected through macOS accessibility and window capture

Both images were inspected at original resolution with `view_image` after the interaction tests.

## Fidelity ledger

1. **Workspace hierarchy — matched.** Both versions use one persistent rail, one dominant inventory surface, a fixed inspector, and a bottom change ledger. The implementation narrows the inspector from the concept so all 50 main slots fit without horizontal scrolling.
2. **Primary action — matched.** `Save changes` remains the only filled top-bar action. Undo and redo are adjacent and correctly disable when history is empty.
3. **Search model — matched.** The exact placeholder `Find any item by name or ID` is implemented with Command/Ctrl+K focus, target-slot context, numeric-ID matching, and a no-catalog-result explanation.
4. **Slot clarity — improved from concept.** The implementation numbers every slot directly, labels main/coin/ammo ranges, and exposes full item/stack names through accessible button labels. It removes the concept's decorative column numbering.
5. **Safety state — matched and extended.** `Safe to edit`, file version, unsaved count, and individual changes are visible. The native implementation adds compatibility confirmation, disabled save on a clean document, and backup-path confirmation after save.
6. **Item visuals — intentional deviation.** The concept contains generated sprite-like art. The implementation uses neutral name glyphs because PlrForge does not bundle Re-Logic assets. A future adapter may read user-owned local assets.
7. **Window chrome — intentional deviation.** The concept draws macOS traffic lights inside the mockup. Tauri uses the real system title bar, so the web layer does not imitate native controls.
8. **Change ledger — simplified.** The concept shows a tall two-row log. The implementation uses a compact persistent strip with the three latest edits, preserving more vertical space for the 58-slot grid.

## Exact copy differences

- `Character` remains `Character`
- `Equipment` → `Loadouts`
- `Buffs` → `Effects`
- `Research` → `Journey`
- `Storage` remains `Storage`
- `Inventory` remains `Inventory`
- `Safe to edit`, `Save changes`, `Main inventory`, `Coins`, `Ammo`, `Stack`, `Modifier`, `Favorite`, `Remove from slot`, and `Find any item by name or ID` remain exact.
- `Replace slot` is represented as search-result context (`Replace slot N`) instead of a second inspector button.

## Interaction verification

- Loaded the browser demo at 1440×900.
- Selected empty slot 21.
- Searched for `Magic Lantern` and confirmed ID 3043 was the first match.
- Added it specifically to slot 21.
- Confirmed Undo, Redo, and Save became enabled.
- Undid the edit and confirmed slot 21 returned to empty.
- Redid the edit and confirmed the change ledger returned.
- Built and launched the native macOS bundle.
- Confirmed automatic discovery of `NewBruv`, file version 325.
- Loaded `NewBruv` in the packaged app and confirmed the live 58-slot inventory and item inspector rendered.
- Did not modify or save the live player during UI QA.
- Opened all three loadout views and confirmed armor, vanity, dye, visibility, and misc equipment controls render from the normalized model.
- Confirmed head-slot search filters to compatible helmet items, added Iron Helmet, and undid back to the original empty slot.
- Copied Magic Lantern from inventory to Safe slot 4 and confirmed the target, ledger, and Save state changed together.
- Confirmed navigation resets the workspace scroll position and browser console output remains clean.
- React Doctor completed at 100/100 with no diagnostics.
- Opened the Character workspace at 1280×720 and verified identity, stats, appearance, permanent upgrades, records, warnings, shared undo/redo, and unsaved/save state.
- Confirmed the Character pane owns vertical scrolling while the header and change ledger stay pinned; no page or horizontal overflow remains.
- Added Ironskin from the complete v325 buff catalog, changed it to 108,000 ticks with the 30-minute control, and confirmed both changes in the shared ledger.
- Enabled personal Journey Godmode, completed Dirt Block research, bulk-completed all tracked research to 9999, and verified serialized-state labels and counts.
- Added and rapidly edited a `QA World / 424242 / 515 / 220` spawn record, removed it, and confirmed global Undo restored the complete record.
- Rechecked all three new workspaces at 1280×720: the body remains fixed, the footer remains pinned, the workspace owns scrolling, and browser warnings/errors remain empty.

## Remaining deviations

- Real item sprites are absent by policy and licensing design.
- Historical `.plr` versions remain fail-closed until their own codecs and golden fixtures are implemented.
- The offline item and buff catalogs currently contribute a roughly 1.1 MB uncompressed JavaScript chunk (about 221 KB gzip). They should move to indexed lazy-loaded resources before 1.0.
