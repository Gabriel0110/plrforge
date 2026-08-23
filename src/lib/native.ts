import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { DiscoveredPlayer, PlayerDocument, SaveReceipt } from "../types";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isDesktop = () => Boolean(window.__TAURI_INTERNALS__);

export async function choosePlayerFile(): Promise<string | null> {
  if (!isDesktop()) return null;
  return open({
    multiple: false,
    directory: false,
    filters: [{ name: "Terraria player", extensions: ["plr"] }],
  });
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
