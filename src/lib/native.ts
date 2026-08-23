import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { DiscoveredPlayer, PlayerDocument, SaveReceipt } from "../types";

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
