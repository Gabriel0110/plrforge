# Character recovery

Stop and close Terraria before recovering a player. Do not delete or overwrite any remaining copy while diagnosing the problem.

## Restore inside PlrForge

1. Open the affected character.
2. Open **Backups**.
3. Select the most recent known-good entry and choose **Restore**.
4. Confirm the restore. PlrForge first preserves the current file as a new `pre-restore` backup, restores the selected copy, and reloads it.

Restore is disabled while the editor has unsaved changes. Either save those changes or reload the character before restoring.

## Restore manually

Each successful PlrForge save creates a timestamped copy beside the character in:

```text
<Terraria Players folder>/.plrforge-backups/
```

With Terraria and PlrForge closed:

1. Make a separate copy of the current `.plr`, its Terraria `.bak`, and the `.plrforge-backups` directory.
2. Choose a backup whose name matches the affected character and copy it into the Players folder.
3. Rename the copied file to the character's original `<name>.plr` filename.
4. Start Terraria and verify the character before removing any recovery copies.

Default player folders are:

- macOS: `~/Library/Application Support/Terraria/Players`
- Windows: `%USERPROFILE%\Documents\My Games\Terraria\Players`

If Steam Cloud immediately restores the broken file, disable cloud synchronization for Terraria temporarily, repeat the restore, verify the local character, and only then resolve the cloud conflict.
