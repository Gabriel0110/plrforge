# Accessibility

PlrForge is designed for keyboard use and exposes native accessibility semantics through the operating system webview. Accessibility is part of the release gate, not a one-time interface pass.

## Implemented behavior

- A skip link moves focus directly to the active editor workspace.
- The sidebar, loadout selectors, storage selectors, and catalog categories use one roving tab stop with arrow-key movement.
- Inventory, Hotbar, coin, ammo, storage, equipment, and catalog grids use one tab stop per grid. Arrow keys move within the grid; Home and End move within a row; Control+Home and Control+End move to the first and last item.
- Item and buff searches expose named comboboxes, listboxes, active options, and Escape-to-close behavior.
- Slots expose their location, item name, and selected state. Focused items expose the same locally generated Terraria details as pointer tooltips.
- Update, save, compatibility, and unsaved-change messages use live status or alert semantics.
- Focus remains visible, animation respects reduced-motion preferences, and text alternatives remain available when Terraria artwork is unavailable.

## Native verification

The packaged macOS app is inspected through the macOS Accessibility API in addition to browser-level tests. The current v0.1.1 audit confirmed:

- the player picker, editor navigation, update controls, and save controls have names and roles;
- the current v326 character state is announced without editing the file;
- Hotbar arrows move native accessibility focus without changing the selected slot;
- catalog categories expose mutually exclusive radio state and activate with arrow keys;
- item search exposes an expanded combo box and a named results list;
- item slots expose toggle state, item names, stack controls, modifier controls, and favorite state;
- no player-file write occurred during the audit.

This API inspection validates the semantic layer consumed by VoiceOver, but it is not a substitute for listening to a complete task with VoiceOver. A manual speech-output pass remains required before the first stable release.

## Release checklist

### macOS — VoiceOver

1. Start VoiceOver and open a disposable supported player copy.
2. Use the skip link, then traverse every sidebar workspace without a pointer.
3. Move across Hotbar, Backpack, Coins, Ammo, storage, loadout, and catalog grids. Confirm focus and selection are announced separately.
4. Search for an item, move through results, choose it, undo it, and confirm the change ledger announcement.
5. Exercise native select, number, range, color, and switch controls in Character, Journey, Effects, and the item inspector.
6. Trigger every update-check outcome and a validation error; confirm the status is announced once and focus is not stolen.
7. Save only a disposable copy, confirm the backup message, reopen it, and restore its backup.

### Windows — NVDA

Repeat the same task flow with current NVDA and Windows WebView2. Also verify Windows high-contrast mode, 125% and 200% scaling, installer dialogs, the native file picker, and SmartScreen/signing messaging.

## Reporting accessibility issues

Please include the operating system, assistive technology and version, PlrForge version, active workspace, exact keyboard sequence, expected announcement, and actual announcement. Never attach a personal `.plr` file; reproduce with a disposable character when possible.
