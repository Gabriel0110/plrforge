# PlrForge local metadata helper

This small .NET Framework console helper reads item defaults and English localization from a
user-owned Terraria installation. PlrForge runs it locally while preparing game assets, caches the
result by Terraria version, resolves requested item-prefix combinations on demand, and never uploads
or redistributes the extracted data.

The helper uses reflection so a Terraria update can fail safely without preventing the editor or
icon cache from working. The compiled helper is embedded in the Tauri binary; this source is its
reproducible implementation.
