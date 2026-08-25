import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseArchitectures, parseSigningDetails } from "./macos-artifact.mjs";
import { generateChecksums, verifyVersions } from "./release.mjs";

async function versionFixture(versions) {
  const root = await mkdtemp(path.join(os.tmpdir(), "plrforge-release-"));
  await mkdir(path.join(root, "src-tauri"));
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ version: versions.package }),
  );
  await writeFile(
    path.join(root, "src-tauri", "tauri.conf.json"),
    JSON.stringify({ version: versions.tauri }),
  );
  await writeFile(
    path.join(root, "src-tauri", "Cargo.toml"),
    `[package]\nname = "plrforge"\nversion = "${versions.cargo}"\n\n[dependencies]\n`,
  );
  return root;
}

test("verifyVersions accepts one matching SemVer across every source", async () => {
  const root = await versionFixture({
    package: "1.2.3-beta.1",
    tauri: "1.2.3-beta.1",
    cargo: "1.2.3-beta.1",
  });
  assert.equal(await verifyVersions(root, "1.2.3-beta.1"), "1.2.3-beta.1");
});

test("verifyVersions rejects mismatched source and requested versions", async () => {
  const root = await versionFixture({ package: "1.2.3", tauri: "1.2.4", cargo: "1.2.3" });
  await assert.rejects(verifyVersions(root), /do not match/);

  const matchingRoot = await versionFixture({
    package: "1.2.3",
    tauri: "1.2.3",
    cargo: "1.2.3",
  });
  await assert.rejects(verifyVersions(matchingRoot, "1.2.4"), /does not match/);
});

test("generateChecksums validates bundle types and ignores metadata", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plrforge-assets-"));
  await writeFile(path.join(root, "PlrForge.dmg"), "mac");
  await writeFile(path.join(root, "PlrForge.msi"), "windows");
  await writeFile(path.join(root, "COMPATIBILITY.md"), "metadata");
  await writeFile(path.join(root, "RECOVERY.md"), "metadata");

  const result = await generateChecksums(root, [".dmg", ".msi"]);
  assert.deepEqual(result.files, ["PlrForge.dmg", "PlrForge.msi"]);
  const manifest = await readFile(result.manifestPath, "utf8");
  assert.match(manifest, /^[a-f0-9]{64}  PlrForge\.dmg$/m);
  assert.match(manifest, /^[a-f0-9]{64}  PlrForge\.msi$/m);
  assert.doesNotMatch(manifest, /COMPATIBILITY/);
  assert.doesNotMatch(manifest, /RECOVERY/);

  await assert.rejects(
    generateChecksums(root, [".exe"]),
    /missing the required \.exe bundle/,
  );
});

test("macOS artifact parsers distinguish preview and Developer ID signatures", () => {
  assert.deepEqual(parseArchitectures("x86_64 arm64\n"), ["arm64", "x86_64"]);
  assert.deepEqual(
    parseSigningDetails("CodeDirectory flags=0x10002(adhoc,runtime)\nSignature=adhoc\nTeamIdentifier=not set"),
    {
      adHoc: true,
      hardenedRuntime: true,
      authorities: [],
      teamIdentifier: "not set",
    },
  );
  assert.deepEqual(
    parseSigningDetails("CodeDirectory flags=0x10000(runtime)\nAuthority=Developer ID Application: Example (TEAMID)\nAuthority=Developer ID Certification Authority\nTeamIdentifier=TEAMID"),
    {
      adHoc: false,
      hardenedRuntime: true,
      authorities: ["Developer ID Application: Example (TEAMID)", "Developer ID Certification Authority"],
      teamIdentifier: "TEAMID",
    },
  );
});
