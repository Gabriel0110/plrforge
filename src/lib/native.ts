import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import type { DiscoveredPlayer, PlayerCompatibility, PlayerDocument, SaveReceipt } from "../types";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isDesktop = () => Boolean(window.__TAURI_INTERNALS__);

export type GameAssetStatus = {
  state: "preparing" | "ready" | "missing" | "error" | "preview";
  sourcePath: string | null;
  cachePath: string | null;
  itemCount: number;
  buffCount: number;
  metadataCount: number;
  metadataMessage: string;
  message: string;
};

export type GameItemMetadata = {
  id: number;
  key?: string;
  name?: string;
  tooltip?: string;
  damage?: number;
  crit?: number;
  knockBack?: number;
  useTime?: number;
  useAnimation?: number;
  mana?: number;
  defense?: number;
  pick?: number;
  axe?: number;
  hammer?: number;
  healLife?: number;
  healMana?: number;
  bait?: number;
  fishingPole?: number;
  tileBoost?: number;
  useAmmo?: number;
  ammo?: number;
  buffType?: number;
  buffTime?: number;
  mountType?: number;
  createTile?: number;
  createWall?: number;
  value?: number;
  rare?: number;
  maxStack?: number;
  prefix?: number;
  melee?: boolean;
  ranged?: boolean;
  magic?: boolean;
  summon?: boolean;
  accessory?: boolean;
  consumable?: boolean;
  material?: boolean;
  autoReuse?: boolean;
  channel?: boolean;
};

export type GameMetadataCatalog = {
  schemaVersion: number;
  terrariaVersion: string;
  items: GameItemMetadata[];
};

export type BackupEntry = {
  path: string;
  fileName: string;
  size: number;
  modifiedAt: string;
  characterName: string | null;
  version: number | null;
  compatible: boolean;
  detail: string;
};

export type RestoreReceipt = {
  safetyBackupPath: string;
  restoredAt: string;
};

export type UpdateStatus = {
  state: "updateAvailable" | "upToDate" | "unconfigured" | "error" | "preview";
  currentVersion: string;
  latestVersion: string | null;
  releaseName: string | null;
  releaseUrl: string | null;
  publishedAt: string | null;
  message: string;
};

export async function choosePlayerFile(): Promise<string | null> {
  if (!isDesktop()) return null;
  return open({
    multiple: false,
    directory: false,
    filters: [{ name: "Terraria player", extensions: ["plr"] }],
  });
}

export async function chooseTerrariaFolder(): Promise<string | null> {
  if (!isDesktop()) return null;
  const chosen = await open({
    multiple: false,
    directory: true,
    title: "Choose Terraria or its Content folder",
  });
  return Array.isArray(chosen) ? chosen[0] ?? null : chosen;
}

let automaticAssetPreparation: Promise<GameAssetStatus> | null = null;

export function prepareGameAssets(sourcePath?: string): Promise<GameAssetStatus> {
  if (!isDesktop()) {
    return Promise.resolve({
      state: "preview",
      sourcePath: null,
      cachePath: null,
      itemCount: 0,
      buffCount: 0,
      metadataCount: 0,
      metadataMessage: "Local item details require the desktop app and an installed copy of Terraria.",
      message: "Game icons are available in the desktop app from a locally installed copy of Terraria.",
    });
  }
  if (sourcePath) return invoke<GameAssetStatus>("prepare_game_assets", { sourcePath });
  if (automaticAssetPreparation) return automaticAssetPreparation;
  const preparation = invoke<GameAssetStatus>("prepare_game_assets", { sourcePath: null }).finally(() => {
    automaticAssetPreparation = null;
  });
  automaticAssetPreparation = preparation;
  return preparation;
}

export function loadGameItemMetadata(cachePath: string): Promise<GameMetadataCatalog> {
  return invoke("load_game_item_metadata", { cachePath });
}

export function loadGameItemVariants(cachePath: string, requests: Array<{ id: number; prefix: number }>): Promise<GameItemMetadata[]> {
  return invoke("load_game_item_variants", { cachePath, requests });
}

export function gameAssetUrl(cachePath: string, kind: "item" | "buff", id: number) {
  const directory = kind === "item" ? "items" : "buffs";
  const prefix = kind === "item" ? "Item" : "Buff";
  return convertFileSrc(`${cachePath}/${directory}/${prefix}_${id}.png`);
}

export function discoverPlayers(): Promise<DiscoveredPlayer[]> {
  return invoke("discover_players");
}

export function loadPlayer(path: string): Promise<PlayerDocument> {
  return invoke("load_player", { path });
}

export function inspectPlayer(path: string): Promise<PlayerCompatibility> {
  return invoke("inspect_player", { path });
}

export function savePlayer(document: PlayerDocument): Promise<SaveReceipt> {
  return invoke("save_player", {
    request: {
      path: document.path,
      sourceHash: document.sourceHash,
      character: document.character,
      effects: document.effects,
      journey: document.journey,
      spawnPoints: document.spawnPoints,
      inventory: document.inventory,
      equipment: document.equipment,
      storage: document.storage,
    },
  });
}

export function listBackups(playerPath: string): Promise<BackupEntry[]> {
  if (!isDesktop()) return Promise.resolve([]);
  return invoke("list_backups", { playerPath });
}

export function restoreBackup(playerPath: string, backupPath: string): Promise<RestoreReceipt> {
  return invoke("restore_backup", { playerPath, backupPath });
}

export function revealBackup(playerPath: string, backupPath: string): Promise<void> {
  return invoke("reveal_backup", { playerPath, backupPath });
}

let updateCheck: Promise<UpdateStatus> | null = null;

export function checkForUpdates(): Promise<UpdateStatus> {
  if (!isDesktop()) {
    return Promise.resolve({
      state: "preview",
      currentVersion: "0.1.0",
      latestVersion: null,
      releaseName: null,
      releaseUrl: null,
      publishedAt: null,
      message: "GitHub release checks run in the desktop app.",
    });
  }
  if (updateCheck) return updateCheck;
  updateCheck = invoke<UpdateStatus>("check_for_updates").finally(() => {
    updateCheck = null;
  });
  return updateCheck;
}

export function openReleasePage(url: string): Promise<void> {
  return invoke("open_release_page", { url });
}

export function appVersion(): Promise<string> {
  return isDesktop() ? getVersion() : Promise.resolve("0.1.0");
}
