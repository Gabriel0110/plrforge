import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  chooseTerrariaFolder,
  gameAssetUrl,
  isDesktop,
  prepareGameAssets,
  type GameAssetStatus,
} from "./native";

type AssetContextValue = {
  status: GameAssetStatus;
  locate: () => Promise<void>;
  iconUrl: (kind: "item" | "buff", id: number) => string | null;
};

const previewStatus: GameAssetStatus = {
  state: "preview",
  sourcePath: null,
  cachePath: null,
  itemCount: 0,
  buffCount: 0,
  message: "Game icons are available in the desktop app from a locally installed copy of Terraria.",
};

const defaultValue: AssetContextValue = {
  status: previewStatus,
  locate: async () => undefined,
  iconUrl: () => null,
};

const AssetContext = createContext<AssetContextValue>(defaultValue);

export function GameAssetProvider({ children }: { children: ReactNode }) {
  const desktop = isDesktop();
  const [status, setStatus] = useState<GameAssetStatus>(desktop ? {
    ...previewStatus,
    state: "preparing",
    message: "Looking for a local Terraria installation…",
  } : previewStatus);

  const runPreparation = useCallback(async (sourcePath?: string) => {
    setStatus((current) => ({ ...current, state: "preparing", message: "Preparing local Terraria icons…" }));
    try {
      setStatus(await prepareGameAssets(sourcePath));
    } catch (reason) {
      setStatus({
        state: "error",
        sourcePath: sourcePath ?? null,
        cachePath: null,
        itemCount: 0,
        buffCount: 0,
        message: reason instanceof Error ? reason.message : String(reason),
      });
    }
  }, []);

  useEffect(() => {
    if (desktop) void runPreparation();
  }, [desktop, runPreparation]);

  const locate = useCallback(async () => {
    const source = await chooseTerrariaFolder();
    if (source) await runPreparation(source);
  }, [runPreparation]);

  const iconUrl = useCallback((kind: "item" | "buff", id: number) => {
    if (status.state !== "ready" || !status.cachePath || id <= 0) return null;
    return gameAssetUrl(status.cachePath, kind, id);
  }, [status.cachePath, status.state]);

  const value = useMemo(() => ({ status, locate, iconUrl }), [iconUrl, locate, status]);
  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useGameAssets() {
  return useContext(AssetContext);
}
