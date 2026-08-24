# Player-file compatibility

PlrForge edits encrypted desktop Terraria `.plr` character files only. It does not edit worlds, console/mobile saves, server-side characters, or tModLoader `.tplr` data.

| Player format | Terraria generation | Status | What PlrForge does |
| --- | --- | --- | --- |
| v279 | 1.4.4.x | Verified | Opens, edits, validates, backs up, writes, decrypts, and verifies the saved payload. |
| v317 | 1.4.5.x | Verified | Opens, edits, validates, backs up, writes, decrypts, and verifies the saved payload. |
| v325 | 1.4.5.x | Verified | Opens, edits, validates, backs up, writes, decrypts, and verifies the saved payload. |
| v326 | 1.4.5.8 | Verified | Opens, edits, validates, backs up, writes, decrypts, and verifies the saved payload. |
| v1–v278, v280–v316, v318–v324 | Historical desktop formats | Needs fixture | Shows the detected version but keeps editing disabled until that exact layout passes the golden-fixture suite. |
| v327 and newer | Newer than the latest verified format | Update needed | Keeps editing disabled and asks the user to update PlrForge. |
| v0, negative, truncated, or undecryptable data | Not a recognized desktop player payload | Unsupported | Rejects the file without entering the editor. |

“Verified” is intentionally exact-version, not a best-effort range. Each enabled codec has mutation coverage, byte-identical no-edit round trips, a disposable real-file regression path, and the same guarded save transaction. PlrForge fails closed when a Terraria update changes the player-file version.

## Save precautions

1. Close Terraria before opening or restoring a character. Steam Cloud can otherwise overwrite either program's changes.
2. Keep the original `.plr` and Terraria's `.bak` file until the edited character has loaded successfully in the game.
3. Save once, reopen the character in PlrForge, and then verify it in Terraria before making further edits.
4. Use the **Backups** workspace to restore a PlrForge backup. A restore creates another pre-restore safety copy first.

See [Recovery](RECOVERY.md) for manual recovery steps and backup locations.
