import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  chooseTerrariaFolder,
  gameAssetUrl,
  isDesktop,
  loadGameItemMetadata,
  loadGameItemVariants,
  prepareGameAssets,
  type GameAssetStatus,
  type GameItemMetadata,
} from "./native";

type AssetContextValue = {
  status: GameAssetStatus;
  locate: () => Promise<void>;
  iconUrl: (kind: "item" | "buff", id: number) => string | null;
  itemMetadata: (id: number, prefix?: number) => GameItemMetadata | null;
  prefetchItemMetadata: (requests: Array<{ id: number; prefix: number }>) => Promise<void>;
  metadataVersion: string | null;
};

const previewStatus: GameAssetStatus = {
  state: "preview",
  sourcePath: null,
  cachePath: null,
  itemCount: 0,
  buffCount: 0,
  metadataCount: 0,
  metadataMessage: "Local item details require the desktop app and an installed copy of Terraria.",
  message: "Game icons are available in the desktop app from a locally installed copy of Terraria.",
};

const defaultValue: AssetContextValue = {
  status: previewStatus,
  locate: async () => undefined,
  iconUrl: () => null,
  itemMetadata: () => null,
  prefetchItemMetadata: async () => undefined,
  metadataVersion: null,
};

const AssetContext = createContext<AssetContextValue>(defaultValue);

export function GameAssetProvider({ children }: { children: ReactNode }) {
  const desktop = isDesktop();
  const [status, setStatus] = useState<GameAssetStatus>(desktop ? {
    ...previewStatus,
    state: "preparing",
    message: "Looking for a local Terraria installation…",
  } : previewStatus);
  const [metadata, setMetadata] = useState<Map<number, GameItemMetadata>>(new Map());
  const [variants, setVariants] = useState<Map<string, GameItemMetadata>>(new Map());
  const [metadataVersion, setMetadataVersion] = useState<string | null>(null);

  const runPreparation = useCallback(async (sourcePath?: string) => {
    setStatus((current) => ({ ...current, state: "preparing", message: "Preparing local Terraria icons…" }));
    try {
      const prepared = await prepareGameAssets(sourcePath);
      setStatus(prepared);
      if (prepared.state === "ready" && prepared.cachePath && prepared.metadataCount > 0) {
        try {
          const catalog = await loadGameItemMetadata(prepared.cachePath);
          setMetadata(new Map(catalog.items.map((item) => [item.id, item])));
          setVariants(new Map());
          setMetadataVersion(catalog.terrariaVersion);
        } catch {
          setMetadata(new Map());
          setVariants(new Map());
          setMetadataVersion(null);
        }
      } else {
        setMetadata(new Map());
        setVariants(new Map());
        setMetadataVersion(null);
      }
    } catch (reason) {
      setMetadata(new Map());
      setVariants(new Map());
      setMetadataVersion(null);
      setStatus({
        state: "error",
        sourcePath: sourcePath ?? null,
        cachePath: null,
        itemCount: 0,
        buffCount: 0,
        metadataCount: 0,
        metadataMessage: "Local item details are unavailable.",
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

  const itemMetadata = useCallback((id: number, prefix = 0) => {
    if (prefix > 0) {
      const variant = variants.get(`${id}:${prefix}`);
      if (variant) return variant;
    }
    return metadata.get(id) ?? null;
  }, [metadata, variants]);

  const prefetchItemMetadata = useCallback(async (requests: Array<{ id: number; prefix: number }>) => {
    if (status.state !== "ready" || !status.cachePath) return;
    const missingByKey = new Map<string, { id: number; prefix: number }>();
    for (const request of requests) {
      const key = `${request.id}:${request.prefix}`;
      if (request.id > 0 && request.prefix > 0 && !variants.has(key)) missingByKey.set(key, request);
    }
    const missing = [...missingByKey.values()];
    if (!missing.length) return;
    try {
      const loaded = await loadGameItemVariants(status.cachePath, missing);
      setVariants((current) => {
        const next = new Map(current);
        for (const item of loaded) if ((item.prefix ?? 0) > 0) next.set(`${item.id}:${item.prefix}`, item);
        return next;
      });
    } catch {
      // Base metadata remains available when a future Terraria prefix layout changes.
    }
  }, [status.cachePath, status.state, variants]);

  const value = useMemo(() => ({ status, locate, iconUrl, itemMetadata, prefetchItemMetadata, metadataVersion }), [iconUrl, itemMetadata, locate, metadataVersion, prefetchItemMetadata, status]);
  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useGameAssets() {
  return useContext(AssetContext);
}
