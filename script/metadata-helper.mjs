import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("metadata-helper/bin/Release/net48/PlrForge.Metadata.exe");
const target = resolve("src-tauri/resources/PlrForge.Metadata.exe");

if (!existsSync(source)) {
  throw new Error(`Metadata helper build was not found at ${source}`);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Embedded metadata helper: ${target}`);
