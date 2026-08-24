#!/usr/bin/env node

import { createHash } from "node:crypto";
import { appendFile, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const METADATA_FILES = new Set(["COMPATIBILITY.md", "RECOVERY.md", "SHA256SUMS.txt"]);

export async function readVersions(root) {
  const [packageSource, tauriSource, cargoSource] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, "src-tauri", "tauri.conf.json"), "utf8"),
    readFile(path.join(root, "src-tauri", "Cargo.toml"), "utf8"),
  ]);

  const packageVersion = JSON.parse(packageSource).version;
  const tauriVersion = JSON.parse(tauriSource).version;
  const packageSection = cargoSource.match(
    /^\[package\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m,
  )?.[1];
  const cargoVersion = packageSection?.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1];

  if (!packageVersion || !tauriVersion || !cargoVersion) {
    throw new Error("Could not read every application version source.");
  }

  return {
    "package.json": packageVersion,
    "src-tauri/tauri.conf.json": tauriVersion,
    "src-tauri/Cargo.toml": cargoVersion,
  };
}

export async function verifyVersions(root, expectedVersion) {
  const versions = await readVersions(root);
  const uniqueVersions = new Set(Object.values(versions));

  if (uniqueVersions.size !== 1) {
    const detail = Object.entries(versions)
      .map(([file, version]) => `${file}=${version}`)
      .join(", ");
    throw new Error(`Application versions do not match: ${detail}`);
  }

  const [version] = uniqueVersions;
  if (!SEMVER.test(version)) {
    throw new Error(`Application version is not valid SemVer: ${version}`);
  }
  if (expectedVersion && expectedVersion !== version) {
    throw new Error(
      `Requested release ${expectedVersion} does not match the source version ${version}.`,
    );
  }

  return version;
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, entryPath)));
    } else if (entry.isFile()) {
      files.push({
        absolutePath: entryPath,
        relativePath: path.relative(root, entryPath).split(path.sep).join("/"),
      });
    }
  }
  return files;
}

export async function generateChecksums(root, requiredSuffixes = []) {
  const allFiles = await listFiles(root);
  const files = allFiles
    .filter(({ relativePath }) => !METADATA_FILES.has(path.basename(relativePath)))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));

  if (files.length === 0) {
    throw new Error(`No release artifacts were found in ${root}.`);
  }

  const names = files.map(({ relativePath }) => relativePath);
  for (const suffix of requiredSuffixes) {
    if (!names.some((name) => name.toLowerCase().endsWith(suffix.toLowerCase()))) {
      throw new Error(`Release artifacts are missing the required ${suffix} bundle.`);
    }
  }

  const lines = [];
  for (const file of files) {
    const digest = createHash("sha256")
      .update(await readFile(file.absolutePath))
      .digest("hex");
    lines.push(`${digest}  ${file.relativePath}`);
  }

  const manifestPath = path.join(root, "SHA256SUMS.txt");
  await writeFile(manifestPath, `${lines.join("\n")}\n`, "utf8");
  return { manifestPath, files: names };
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "verify") {
    const expected = optionValue(args, "--expected");
    const root = path.resolve(optionValue(args, "--root") ?? process.cwd());
    const version = await verifyVersions(root, expected);
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`, "utf8");
    }
    console.log(`Release version verified: ${version}`);
    return;
  }

  if (command === "checksums") {
    const directory = args.find((argument) => !argument.startsWith("--"));
    if (!directory) {
      throw new Error("Usage: node script/release.mjs checksums <directory> [--require .dmg,.msi]");
    }
    const required = (optionValue(args, "--require") ?? "")
      .split(",")
      .map((suffix) => suffix.trim())
      .filter(Boolean);
    const result = await generateChecksums(path.resolve(directory), required);
    console.log(`Checksummed ${result.files.length} artifacts in ${result.manifestPath}`);
    return;
  }

  throw new Error(
    "Usage: node script/release.mjs <verify|checksums> [options]",
  );
}

const isEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
