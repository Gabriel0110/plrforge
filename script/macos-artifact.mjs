#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { verifyVersions } from "./release.mjs";

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed${output ? `:\n${output}` : "."}`);
  }
  return output;
}

export function parseSigningDetails(source) {
  const flags = source.match(/flags=\S+\(([^)]+)\)/)?.[1]?.split(",") ?? [];
  return {
    adHoc: source.includes("Signature=adhoc") || flags.includes("adhoc"),
    hardenedRuntime: flags.includes("runtime"),
    authorities: [...source.matchAll(/^Authority=(.+)$/gm)].map((match) => match[1].trim()),
    teamIdentifier: source.match(/^TeamIdentifier=(.+)$/m)?.[1]?.trim() ?? null,
  };
}

export function parseArchitectures(source) {
  return source.trim().split(/\s+/).filter(Boolean).sort();
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function plistValue(plistPath, key) {
  return run("plutil", ["-extract", key, "raw", "-o", "-", plistPath]);
}

function sameValues(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export async function validateMacArtifact(appPath, options) {
  if (process.platform !== "darwin") throw new Error("macOS artifact validation must run on macOS.");
  const resolvedApp = path.resolve(appPath);
  if (!(await stat(resolvedApp)).isDirectory() || !resolvedApp.endsWith(".app")) {
    throw new Error(`Expected a macOS .app bundle: ${resolvedApp}`);
  }

  const root = path.resolve(options.root ?? process.cwd());
  const version = await verifyVersions(root);
  const plistPath = path.join(resolvedApp, "Contents", "Info.plist");
  const executableName = plistValue(plistPath, "CFBundleExecutable");
  const identifier = plistValue(plistPath, "CFBundleIdentifier");
  const bundleVersion = plistValue(plistPath, "CFBundleShortVersionString");
  if (identifier !== "app.plrforge.desktop") {
    throw new Error(`Unexpected bundle identifier: ${identifier}`);
  }
  if (bundleVersion !== version) {
    throw new Error(`Bundle version ${bundleVersion} does not match source version ${version}.`);
  }

  const executablePath = path.join(resolvedApp, "Contents", "MacOS", executableName);
  run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", resolvedApp]);
  const signing = parseSigningDetails(run("codesign", ["-dvvv", resolvedApp]));
  if (!signing.hardenedRuntime) throw new Error("The app is not signed with hardened runtime enabled.");

  const expectedArchitectures = [...options.expectedArchitectures].sort();
  const architectures = parseArchitectures(run("lipo", ["-archs", executablePath]));
  if (!sameValues(architectures, expectedArchitectures)) {
    throw new Error(`Expected architectures ${expectedArchitectures.join(", ")}; found ${architectures.join(", ")}.`);
  }

  if (options.mode === "preview") {
    if (!signing.adHoc) throw new Error("Preview validation expected an ad-hoc signature.");
  } else if (options.mode === "distribution") {
    if (signing.adHoc) throw new Error("Distribution validation refuses an ad-hoc signature.");
    if (!signing.authorities.some((authority) => authority.startsWith("Developer ID Application:"))) {
      throw new Error("Distribution validation requires a Developer ID Application signature.");
    }
    if (!signing.teamIdentifier || signing.teamIdentifier === "not set") {
      throw new Error("Distribution validation requires an Apple team identifier.");
    }
    if (!options.dmgPath) throw new Error("Distribution validation requires --dmg so notarization can be checked.");
    run("spctl", ["-a", "-vv", "--type", "execute", resolvedApp]);
    run("xcrun", ["stapler", "validate", resolvedApp]);
    run("xcrun", ["stapler", "validate", path.resolve(options.dmgPath)]);
  } else {
    throw new Error(`Unknown validation mode: ${options.mode}`);
  }

  return { appPath: resolvedApp, architectures, identifier, mode: options.mode, signing, version };
}

async function main() {
  const args = process.argv.slice(2);
  const appPath = args.find((argument) => !argument.startsWith("--"));
  const mode = optionValue(args, "--mode") ?? "preview";
  const expectedArchitectures = (optionValue(args, "--expect-arch") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!appPath || expectedArchitectures.length === 0) {
    throw new Error("Usage: node script/macos-artifact.mjs <PlrForge.app> --mode <preview|distribution> --expect-arch <arm64,x86_64> [--dmg <file>] [--root <repo>]");
  }
  const result = await validateMacArtifact(appPath, {
    dmgPath: optionValue(args, "--dmg"),
    expectedArchitectures,
    mode,
    root: optionValue(args, "--root"),
  });
  console.log(`Validated ${result.mode} macOS bundle v${result.version}: ${result.architectures.join(" + ")} · ${result.signing.adHoc ? "ad-hoc" : "Developer ID"} · hardened runtime`);
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
