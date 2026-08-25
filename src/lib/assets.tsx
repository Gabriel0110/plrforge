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
  itemVariant: (id: number, prefix: number) => ItemVariantResult;
  prefetchItemMetadata: (requests: Array<{ id: number; prefix: number }>) => Promise<void>;
  metadataVersion: string | null;
};

export type ItemVariantResult = {
  state: "unavailable" | "unresolved" | "loading" | "incompatible" | "ready";
  metadata: GameItemMetadata | null;
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
  itemVariant: () => ({ state: "unavailable", metadata: null }),
  prefetchItemMetadata: async () => undefined,
  metadataVersion: null,
};

const AssetContext = createContext<AssetContextValue>(defaultValue);

type AssetData = {
  metadata: Map<number, GameItemMetadata>;
  variants: Map<string, GameItemMetadata>;
  resolvedVariants: Set<string>;
  loadingVariants: Set<string>;
  metadataVersion: string | null;
};

const emptyAssetData = (): AssetData => ({
  metadata: new Map(),
  variants: new Map(),
  resolvedVariants: new Set(),
  loadingVariants: new Set(),
  metadataVersion: null,
});

export function GameAssetProvider({ children }: { children: ReactNode }) {
  const desktop = isDesktop();
  const [status, setStatus] = useState<GameAssetStatus>(desktop ? {
    ...previewStatus,
    state: "preparing",
    message: "Looking for a local Terraria installation…",
  } : previewStatus);
  const [assetData, setAssetData] = useState<AssetData>(emptyAssetData);
  const { metadata, variants, resolvedVariants, loadingVariants, metadataVersion } = assetData;

  const runPreparation = useCallback(async (sourcePath?: string) => {
    setStatus((current) => ({ ...current, state: "preparing", message: "Preparing local Terraria icons…" }));
    try {
      const prepared = await prepareGameAssets(sourcePath);
      setStatus(prepared);
      if (prepared.state === "ready" && prepared.cachePath && prepared.metadataCount > 0) {
        try {
          const catalog = await loadGameItemMetadata(prepared.cachePath);
          setAssetData({
            metadata: new Map(catalog.items.map((item) => [item.id, item])),
            variants: new Map(),
            resolvedVariants: new Set(),
            loadingVariants: new Set(),
            metadataVersion: catalog.terrariaVersion,
          });
        } catch {
          setAssetData(emptyAssetData());
        }
      } else {
        setAssetData(emptyAssetData());
      }
    } catch (reason) {
      setAssetData(emptyAssetData());
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
      if (variant?.canRollPrefix !== false && variant?.prefix === prefix) return variant;
    }
    return metadata.get(id) ?? null;
  }, [metadata, variants]);

  const itemVariant = useCallback((id: number, prefix: number): ItemVariantResult => {
    const base = metadata.get(id) ?? null;
    if (status.state !== "ready" || !base) return { state: "unavailable", metadata: null };
    if (prefix <= 0) return { state: "ready", metadata: base };
    const key = `${id}:${prefix}`;
    const variant = variants.get(key) ?? null;
    if (variant) {
      const compatible = variant.canRollPrefix !== false && variant.prefix === prefix;
      return { state: compatible ? "ready" : "incompatible", metadata: variant };
    }
    if (loadingVariants.has(key)) return { state: "loading", metadata: null };
    if (resolvedVariants.has(key)) return { state: "incompatible", metadata: null };
    return { state: "unresolved", metadata: null };
  }, [loadingVariants, metadata, resolvedVariants, status.state, variants]);

  const prefetchItemMetadata = useCallback(async (requests: Array<{ id: number; prefix: number }>) => {
    if (status.state !== "ready" || !status.cachePath) return;
    const missingByKey = new Map<string, { id: number; prefix: number }>();
    for (const request of requests) {
      const key = `${request.id}:${request.prefix}`;
      if (request.id > 0 && request.prefix > 0 && !variants.has(key) && !resolvedVariants.has(key) && !loadingVariants.has(key)) missingByKey.set(key, request);
    }
    const missing = [...missingByKey.values()];
    if (!missing.length) return;
    const missingKeys = new Set(missing.map((request) => `${request.id}:${request.prefix}`));
    setAssetData((current) => ({ ...current, loadingVariants: new Set([...current.loadingVariants, ...missingKeys]) }));
    try {
      const loaded = await loadGameItemVariants(status.cachePath, missing);
      setAssetData((current) => {
        const next = new Map(current.variants);
        for (const item of loaded) {
          const requestedPrefix = item.requestedPrefix ?? item.prefix ?? 0;
          if (requestedPrefix > 0) next.set(`${item.id}:${requestedPrefix}`, item);
        }
        return {
          ...current,
          variants: next,
          resolvedVariants: new Set([...current.resolvedVariants, ...missingKeys]),
        };
      });
    } catch {
      // Base metadata remains available when a future Terraria prefix layout changes.
    } finally {
      setAssetData((current) => ({
        ...current,
        loadingVariants: new Set([...current.loadingVariants].filter((key) => !missingKeys.has(key))),
      }));
    }
  }, [loadingVariants, resolvedVariants, status.cachePath, status.state, variants]);

  const value = useMemo(() => ({ status, locate, iconUrl, itemMetadata, itemVariant, prefetchItemMetadata, metadataVersion }), [iconUrl, itemMetadata, itemVariant, locate, metadataVersion, prefetchItemMetadata, status]);
  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useGameAssets() {
  return useContext(AssetContext);
}
