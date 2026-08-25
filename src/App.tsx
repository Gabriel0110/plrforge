import {
  ArrowCounterClockwise,
  ArrowUUpRight,
  Backpack,
  Check,
  CircleNotch,
  ClockCounterClockwise,
  Database,
  Flask,
  FolderOpen,
  GearSix,
  IdentificationCard,
  ImagesSquare,
  MapPin,
  ShieldCheck,
  Sparkle,
  SquaresFour,
  Stack,
  Warning,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { EmptyState } from "./components/EmptyState";
import { BackupsPanel } from "./components/BackupsPanel";
import { CharacterPanel } from "./components/CharacterPanel";
import { EffectsPanel } from "./components/EffectsPanel";
import { InventoryGrid } from "./components/InventoryGrid";
import { ItemBrowser } from "./components/ItemBrowser";
import { HeaderUpdateButton } from "./components/HeaderUpdateButton";
import { ItemInspector } from "./components/ItemInspector";
import { ItemSearch } from "./components/ItemSearch";
import { RovingGroup } from "./components/KeyboardNavigation";
import { JourneyPanel } from "./components/JourneyPanel";
import { LoadoutsPanel } from "./components/LoadoutsPanel";
import { LoadingState } from "./components/LoadingState";
import { StoragePanel } from "./components/StoragePanel";
import { SpawnPointsPanel } from "./components/SpawnPointsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { UpdateNotice } from "./components/UpdateNotice";
import { acceptsItem, findItem, itemName } from "./data/catalog";
import { demoPlayer } from "./lib/demo";
import {
  editableDocument,
  editorReducer,
  emptyItem,
  initialEditorState,
  itemAt,
  locationLabel,
  replaceItemAt,
  replaceMiscVisibilityAt,
  replaceVisibilityAt,
  type EditableDocument,
} from "./lib/editor";
import {
  appVersion,
  bundledVersion,
  checkForUpdates,
  choosePlayerFile,
  discoverPlayers,
  isDesktop,
  inspectPlayer,
  loadPlayer,
  openReleasePage,
  savePlayer,
  type RestoreReceipt,
  type UpdateStatus,
} from "./lib/native";
import { useGameAssets } from "./lib/assets";
import type {
  CatalogItem,
  DiscoveredPlayer,
  InventoryItem,
  ItemLocation,
  PlayerDocument,
  StorageKey,
} from "./types";

type View = "overview" | "loadouts" | "inventory" | "catalog" | "storage" | "effects" | "journey" | "spawns" | "backups" | "settings";
type LoadState = "discovering" | "empty" | "loading" | "ready" | "error";
type ClipboardState = { item: InventoryItem; source: ItemLocation; mode: "copy" | "move" };
type WorkspaceState = {
  view: View;
  selected: ItemLocation;
  loadoutIndex: number;
  storageKey: StorageKey;
  query: string;
  clipboard: ClipboardState | null;
};

const initialWorkspace: WorkspaceState = {
  view: "inventory",
  selected: { area: "inventory", slot: 18 },
  loadoutIndex: 0,
  storageKey: "piggyBank",
  query: "",
  clipboard: null,
};

function workspaceReducer(state: WorkspaceState, patch: Partial<WorkspaceState>): WorkspaceState {
  return { ...state, ...patch };
}

const navigation: { id: View; label: string; icon: typeof IdentificationCard; phase?: string }[] = [
  { id: "overview", label: "Character", icon: IdentificationCard },
  { id: "loadouts", label: "Loadouts", icon: ShieldCheck },
  { id: "inventory", label: "Inventory", icon: Backpack },
  { id: "catalog", label: "Item Catalog", icon: SquaresFour },
  { id: "storage", label: "Storage", icon: Database },
  { id: "effects", label: "Effects", icon: Flask },
  { id: "journey", label: "Journey", icon: Sparkle },
  { id: "spawns", label: "Spawn points", icon: MapPin },
];

function makeChangeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sameLocation(left: ItemLocation, right: ItemLocation) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canStack(location: ItemLocation) {
  return location.area === "inventory" || location.area === "storage";
}

function canFavorite(location: ItemLocation, version: number) {
  return location.area === "inventory"
    || (version >= 322 && (location.area === "loadoutArmor" || location.area === "loadoutDye"))
    || (location.area === "storage" && location.storage === "voidVault");
}

function normalizedFor(item: InventoryItem, location: ItemLocation, version: number): InventoryItem {
  return {
    ...item,
    slot: location.slot,
    stack: item.itemId === 0 ? 0 : canStack(location) ? Math.max(1, item.stack) : 1,
    favorited: canFavorite(location, version) ? item.favorited : false,
  };
}

function itemFits(location: ItemLocation, item: InventoryItem) {
  const catalogItem = findItem(item.itemId);
  return item.itemId === 0 || !catalogItem || acceptsItem(location, catalogItem);
}

function SideRail({ view, onView }: { view: View; onView: (view: View) => void }) {
  const utilityButton = (id: View, label: string, Icon: typeof ClockCounterClockwise) => {
    const active = view === id;
    return (
      <button type="button" data-roving-item="" tabIndex={active ? 0 : -1} aria-current={active ? "page" : undefined} onClick={() => onView(id)} className={`group flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-[12px] active:scale-[0.98] ${active ? "border-emerald-400 bg-white/[0.075] font-medium text-white" : "border-transparent bg-transparent text-white/42 hover:bg-white/[0.04] hover:text-white/70"}`}>
        <Icon weight={active ? "fill" : "regular"} className={`size-[17px] ${active ? "text-emerald-300" : "text-white/34 group-hover:text-white/60"}`} />{label}
      </button>
    );
  };
  return (
    <nav aria-label="Character sections" className="min-h-0 border-r border-white/[0.08] bg-[#111513]/78 p-3">
      <RovingGroup label="Editor sections" orientation="vertical" activateOnMove className="flex h-full min-h-0 flex-col">
      <div className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button type="button" data-roving-item="" tabIndex={active ? 0 : -1} aria-current={active ? "page" : undefined} key={item.id} onClick={() => onView(item.id)} className={`group flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-[12px] font-medium active:scale-[0.98] ${active ? "border-emerald-400 bg-white/[0.075] text-white" : "border-transparent bg-transparent text-white/48 hover:bg-white/[0.04] hover:text-white/76"}`}>
              <Icon weight={active ? "fill" : "regular"} className={`size-[17px] ${active ? "text-emerald-300" : "text-white/34 group-hover:text-white/60"}`} />
              <span className="flex-1">{item.label}</span>
              {item.phase && <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-white/22">{item.phase}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-auto space-y-1 border-t border-white/[0.08] pt-3">
        {utilityButton("backups", "Backups", ClockCounterClockwise)}
        {utilityButton("settings", "Settings", GearSix)}
      </div>
      </RovingGroup>
    </nav>
  );
}

function AssetStatusButton() {
  const { status, locate } = useGameAssets();
  if (status.state === "preview") return null;
  if (status.state === "preparing") {
    return <span title={status.message} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] px-3 text-[10px] text-white/38"><CircleNotch className="size-3.5 animate-spin" /><span className="hidden xl:inline">Preparing game data</span></span>;
  }
  const ready = status.state === "ready";
  return (
    <button
      type="button"
      onClick={() => void locate()}
      title={`${status.message}\n${status.metadataMessage}${status.sourcePath ? `\n${status.sourcePath}` : ""}`}
      aria-label={ready ? "Change Terraria game data source" : "Locate Terraria to add game data"}
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[10px] transition ${ready ? "border-sky-300/12 bg-sky-300/[0.035] text-sky-100/58 hover:bg-sky-300/[0.07]" : "border-amber-300/15 bg-amber-300/[0.035] text-amber-100/68 hover:bg-amber-300/[0.07]"}`}
    >
      <ImagesSquare className="size-3.5" />
      <span className="hidden xl:inline">{ready ? status.metadataCount > 0 ? `${status.metadataCount.toLocaleString()} item details` : `${status.itemCount.toLocaleString()} item icons` : "Add game data"}</span>
    </button>
  );
}

export default function App() {
  const desktop = isDesktop();
  const [loadState, setLoadState] = useState<LoadState>(desktop ? "discovering" : "ready");
  const [players, setPlayers] = useState<DiscoveredPlayer[]>([]);
  const [refreshingPlayers, setRefreshingPlayers] = useState(false);
  const playerDiscoveryInFlight = useRef(false);
  const [player, setPlayer] = useState<PlayerDocument | null>(desktop ? null : demoPlayer);
  const [workspace, updateWorkspace] = useReducer(workspaceReducer, initialWorkspace);
  const { view, selected, loadoutIndex, storageKey, query, clipboard } = workspace;
  const setView = (value: View) => updateWorkspace({ view: value });
  const setSelected = (value: ItemLocation) => updateWorkspace({ selected: value });
  const setLoadoutIndex = (value: number) => updateWorkspace({ loadoutIndex: value });
  const setStorageKey = (value: StorageKey) => updateWorkspace({ storageKey: value });
  const setQuery = (value: string) => updateWorkspace({ query: value });
  const setClipboard = (value: ClipboardState | null) => updateWorkspace({ clipboard: value });
  const [message, setMessage] = useState<string | null>(desktop ? null : "Browser preview uses a disposable demo character.");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(bundledVersion);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);
  const [catalogReturnView, setCatalogReturnView] = useState<"inventory" | "loadouts" | "storage" | null>(null);
  const [automaticUpdateChecks, setAutomaticUpdateChecks] = useState(() => localStorage.getItem("plrforge.autoUpdateChecks") === "true");
  const [editor, dispatch] = useReducer(editorReducer, editableDocument(player ?? demoPlayer), initialEditorState);

  const editorDocument = useMemo<EditableDocument>(() => editableDocument(editor), [editor]);
  const currentPlayer = useMemo(() => player ? { ...player, ...editorDocument } : null, [editorDocument, player]);
  const activeVersion = currentPlayer?.version ?? 325;
  const selectedItem = itemAt(editorDocument, selected);

  const loadPath = useCallback(async (path: string) => {
    setLoadState("loading");
    setError(null);
    try {
      const compatibility = await inspectPlayer(path);
      if (!compatibility.canEdit) {
        setLoadState("error");
        setError(compatibility.message);
        return;
      }
      const document = await loadPlayer(path);
      setPlayer(document);
      dispatch({ type: "reset", document: editableDocument(document) });
      const first = document.inventory.find((item) => item.itemId > 0)?.slot ?? 0;
      setSelected({ area: "inventory", slot: first });
      setLoadoutIndex(document.equipment.currentLoadoutIndex);
      setView("inventory");
      setClipboard(null);
      setLoadState("ready");
      setMessage("Compatibility verified. No file data has been changed.");
    } catch (reason) {
      setLoadState("error");
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }, []);

  const refreshPlayers = useCallback(async (initial = false) => {
    if (!desktop || playerDiscoveryInFlight.current) return;
    playerDiscoveryInFlight.current = true;
    setRefreshingPlayers(true);
    if (initial) setLoadState("discovering");
    try {
      setPlayers(await discoverPlayers());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      playerDiscoveryInFlight.current = false;
      setRefreshingPlayers(false);
      if (initial) setLoadState("empty");
    }
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    void refreshPlayers(true);
  }, [desktop, refreshPlayers]);

  useEffect(() => {
    if (!desktop || loadState !== "empty" || currentPlayer) return;
    const refresh = () => void refreshPlayers();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [currentPlayer, desktop, loadState, refreshPlayers]);

  useEffect(() => {
    void appVersion().then(setVersion).catch(() => undefined);
  }, []);

  const runUpdateCheck = useCallback(async () => {
    setShowUpdateNotice(true);
    setCheckingUpdates(true);
    try {
      setUpdateStatus(await checkForUpdates());
    } catch (reason) {
      const currentVersion = await appVersion().catch(() => "unknown");
      setUpdateStatus({
        state: "error",
        currentVersion,
        latestVersion: null,
        releaseName: null,
        releaseUrl: null,
        publishedAt: null,
        message: reason instanceof Error ? reason.message : String(reason),
      });
    } finally {
      setCheckingUpdates(false);
    }
  }, []);

  const viewRelease = async () => {
    if (!updateStatus?.releaseUrl) return;
    try {
      await openReleasePage(updateStatus.releaseUrl);
    } catch (reason) {
      setUpdateStatus({
        ...updateStatus,
        state: "error",
        message: `The release page could not be opened: ${reason instanceof Error ? reason.message : String(reason)}`,
      });
      setShowUpdateNotice(true);
    }
  };

  useEffect(() => {
    if (desktop && automaticUpdateChecks) void runUpdateCheck();
  }, [automaticUpdateChecks, desktop, runUpdateCheck]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.matches("input, textarea, select, [contenteditable='true']") ?? false;
      if (!editingText && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        (document.querySelector<HTMLInputElement>('input[aria-label="Find any item by name or ID"]')
          ?? document.querySelector<HTMLInputElement>('input[aria-label="Search item catalog"]'))?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const applyChange = useCallback((document: EditableDocument, description: string, location: ItemLocation) => {
    dispatch({ type: "change", document, entry: { id: makeChangeId(), description, location: locationLabel(location) } });
  }, []);

  const applyCharacterChange = useCallback((character: PlayerDocument["character"], description: string, location: string) => {
    dispatch({
      type: "change",
      document: { ...editorDocument, character },
      entry: { id: makeChangeId(), description, location },
    });
  }, [editorDocument]);

  const applySystemChange = useCallback((patch: Partial<EditableDocument>, description: string, location: string) => {
    dispatch({
      type: "change",
      document: { ...editorDocument, ...patch },
      entry: { id: makeChangeId(), description, location },
    });
  }, [editorDocument]);

  const navigate = (next: View) => {
    setView(next);
    setCatalogReturnView(null);
    setQuery("");
    if (next === "inventory") setSelected({ area: "inventory", slot: 0 });
    if (next === "loadouts") setSelected({ area: "loadoutArmor", loadout: loadoutIndex, slot: 0 });
    if (next === "storage") setSelected({ area: "storage", storage: storageKey, slot: 0 });
  };

  const browseForSelectedSlot = () => {
    if (view === "inventory" || view === "loadouts" || view === "storage") setCatalogReturnView(view);
    setView("catalog");
    setQuery("");
  };

  const changeAutomaticUpdateChecks = (enabled: boolean) => {
    localStorage.setItem("plrforge.autoUpdateChecks", String(enabled));
    setAutomaticUpdateChecks(enabled);
  };

  const chooseItem = (item: CatalogItem) => {
    if (!acceptsItem(selected, item)) {
      setError(`${item.name} is not compatible with ${locationLabel(selected)}.`);
      return;
    }
    const previous = selectedItem;
    const replacement = normalizedFor({ ...previous, itemId: item.id, stack: 1, prefix: 0, favorited: false }, selected, activeVersion);
    const next = replaceItemAt(editorDocument, selected, replacement);
    applyChange(next, previous.itemId === 0 ? `${item.name} added` : `${itemName(previous.itemId)} replaced with ${item.name}`, selected);
    setQuery("");
    setError(null);
  };

  const patchSelected = (patch: Partial<InventoryItem>, description: string) => {
    const next = replaceItemAt(editorDocument, selected, normalizedFor({ ...selectedItem, ...patch }, selected, activeVersion));
    applyChange(next, `${itemName(selectedItem.itemId)}: ${description}`, selected);
  };

  const removeSelected = () => {
    if (selectedItem.itemId === 0) return;
    const previousName = itemName(selectedItem.itemId);
    applyChange(replaceItemAt(editorDocument, selected, emptyItem(selected.slot)), `${previousName} removed`, selected);
  };

  const paste = () => {
    if (!clipboard || sameLocation(clipboard.source, selected)) return;
    if (!itemFits(selected, clipboard.item)) {
      setError(`${itemName(clipboard.item.itemId)} is not compatible with ${locationLabel(selected)}.`);
      return;
    }
    if (clipboard.mode === "move" && !canStack(selected) && clipboard.item.stack > 1) {
      setError("A stacked item cannot be moved into a single-item equipment slot. Split the stack first.");
      return;
    }
    if (clipboard.mode === "move" && !itemFits(clipboard.source, selectedItem)) {
      setError(`${itemName(selectedItem.itemId)} cannot be swapped into ${locationLabel(clipboard.source)}.`);
      return;
    }
    let next = replaceItemAt(editorDocument, selected, normalizedFor(clipboard.item, selected, activeVersion));
    if (clipboard.mode === "move") {
      next = replaceItemAt(next, clipboard.source, normalizedFor(selectedItem, clipboard.source, activeVersion));
    }
    applyChange(next, `${itemName(clipboard.item.itemId)} ${clipboard.mode === "move" ? "moved" : "copied"}`, selected);
    if (clipboard.mode === "move") setClipboard(null);
    setError(null);
  };

  const changeVisibility = (loadout: number, slot: number, hidden: boolean) => {
    const location: ItemLocation = { area: "loadoutArmor", loadout, slot };
    applyChange(replaceVisibilityAt(editorDocument, loadout, slot, hidden), `${hidden ? "Hidden" : "Shown"} in Loadout ${loadout + 1}`, location);
  };

  const changeMiscVisibility = (slot: number, hidden: boolean) => {
    const location: ItemLocation = { area: "miscEquip", slot };
    applyChange(replaceMiscVisibilityAt(editorDocument, slot, hidden), `${hidden ? "Hidden" : "Shown"} ${locationLabel(location)}`, location);
  };

  const openPlayer = async () => {
    setError(null);
    const path = await choosePlayerFile();
    if (path) await loadPath(path);
  };

  const save = async () => {
    if (!currentPlayer || editor.changes.length === 0) return;
    if (!desktop) {
      dispatch({ type: "saved" });
      setMessage("Preview changes cleared. No file was written.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const receipt = await savePlayer(currentPlayer);
      const reloaded = await loadPlayer(currentPlayer.path);
      setPlayer(reloaded);
      dispatch({ type: "reset", document: editableDocument(reloaded) });
      setMessage(`Saved and verified. Backup: ${receipt.backupPath}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  const restored = async (receipt: RestoreReceipt) => {
    if (!currentPlayer) return;
    const reloaded = await loadPlayer(currentPlayer.path);
    setPlayer(reloaded);
    dispatch({ type: "reset", document: editableDocument(reloaded) });
    setLoadoutIndex(reloaded.equipment.currentLoadoutIndex);
    setClipboard(null);
    setMessage(`Backup restored and verified. Previous file preserved at ${receipt.safetyBackupPath}`);
  };

  const targetLabel = locationLabel(selected);
  const isItemView = view === "inventory" || view === "loadouts" || view === "storage";

  return (
    <div className="flex h-[100dvh] overflow-hidden flex-col bg-[#0e1211] text-white selection:bg-emerald-400/25">
      <a href="#main-content" className="skip-link" onClick={() => requestAnimationFrame(() => document.getElementById("main-content")?.focus())} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); document.getElementById("main-content")?.focus(); } }}>Skip to editor content</a>
      <span className="sr-only" aria-live="polite">{`${navigation.find((item) => item.id === view)?.label ?? view} view`}</span>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/[0.08] bg-[#101413]/95 px-4">
        <div className="flex w-[192px] items-center gap-2.5"><span aria-hidden="true" className="logo-mark"><span /><span /><span /></span><div className="flex flex-col"><span className="text-[15px] font-semibold leading-none tracking-[-0.035em] text-white/92">PlrForge</span><span className="mt-1 font-mono text-[8px] leading-none tracking-[0.08em] text-white/30">v{version}</span></div></div>
        {currentPlayer ? <><div className="flex min-w-0 items-center gap-3 border-l border-white/10 pl-4"><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-white/84">{currentPlayer.character.name}</p><p className="font-mono text-[9px] text-white/30">File version {currentPlayer.version}</p></div><span className="hidden items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.055] px-2 py-1 text-[10px] text-emerald-200/75 xl:flex"><span className="size-1.5 rounded-full bg-emerald-400" />Safe to edit</span></div><div className="ml-auto flex items-center gap-1.5"><AssetStatusButton /><HeaderUpdateButton status={updateStatus} checking={checkingUpdates} onCheck={runUpdateCheck} /><button type="button" onClick={() => dispatch({ type: "undo" })} disabled={!editor.past.length} aria-label="Undo" className="toolbar-button"><ArrowCounterClockwise className="size-4" /></button><button type="button" onClick={() => dispatch({ type: "redo" })} disabled={!editor.future.length} aria-label="Redo" className="toolbar-button"><ArrowUUpRight className="size-4" /></button>{desktop && <button type="button" onClick={openPlayer} className="toolbar-button ml-1 gap-2 px-3"><FolderOpen className="size-4" /><span className="hidden xl:inline">Open</span></button>}<button type="button" onClick={save} disabled={saving || editor.changes.length === 0} className="ml-2 inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3.5 text-[12px] font-semibold text-[#07110d] transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-white/26">{saving ? <span className="size-3.5 animate-pulse rounded bg-current/50" /> : <Check weight="bold" className="size-4" />}{saving ? "Verifying" : "Save changes"}</button></div></> : <><p className="text-xs text-white/30">No player open</p><div className="ml-auto flex items-center gap-1.5"><AssetStatusButton /><HeaderUpdateButton status={updateStatus} checking={checkingUpdates} onCheck={runUpdateCheck} /></div></>}
      </header>

      {showUpdateNotice && (
        <UpdateNotice
          status={updateStatus}
          checking={checkingUpdates}
          onDismiss={() => setShowUpdateNotice(false)}
          onViewRelease={viewRelease}
        />
      )}

      {loadState === "discovering" || loadState === "loading" ? <LoadingState /> : loadState === "error" ? <main id="main-content" tabIndex={-1} className="grid flex-1 place-items-center p-8"><div className="max-w-lg rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-6"><Warning className="size-6 text-rose-300" /><h1 className="mt-4 text-lg font-semibold">Player could not be opened</h1><p className="mt-2 text-sm leading-6 text-white/46">{error}</p><button type="button" onClick={() => setLoadState("empty")} className="mt-5 text-sm font-medium text-emerald-300">Back to player picker</button></div></main> : loadState === "empty" || !currentPlayer ? <EmptyState players={players} refreshing={refreshingPlayers} onRefresh={() => void refreshPlayers()} onOpen={openPlayer} onLoad={loadPath} /> : (
        <div className="grid min-h-0 flex-1 grid-cols-[208px_minmax(0,1fr)]">
          <SideRail view={view} onView={navigate} />
          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div id="main-content" tabIndex={-1} className="grid min-h-0 overflow-hidden">
            {isItemView ? (
              <div className="grid min-h-0 grid-cols-[minmax(700px,1fr)_300px] overflow-hidden">
                <main key={view} className="min-h-0 overflow-y-auto px-6 py-5">
                  <ItemSearch query={query} onQueryChange={setQuery} onChoose={chooseItem} targetLabel={targetLabel} acceptItem={(item) => acceptsItem(selected, item)} onBrowse={browseForSelectedSlot} />
                  <div className="mt-5">
                    {view === "inventory" && <InventoryGrid inventory={editor.inventory} selectedSlot={selected.area === "inventory" ? selected.slot : null} onSelect={(slot) => setSelected({ area: "inventory", slot })} />}
                    {view === "loadouts" && <LoadoutsPanel equipment={editor.equipment} loadout={loadoutIndex} selected={selected} onLoadout={(index) => { setLoadoutIndex(index); setSelected({ area: "loadoutArmor", loadout: index, slot: 0 }); }} onSelect={setSelected} onVisibility={changeVisibility} onMiscVisibility={changeMiscVisibility} />}
                    {view === "storage" && <StoragePanel storage={editor.storage} container={storageKey} selected={selected} onContainer={(container) => { setStorageKey(container); setSelected({ area: "storage", storage: container, slot: 0 }); }} onSelect={setSelected} />}
                  </div>
                </main>
                <ItemInspector item={selectedItem} slotLabel={targetLabel} canStack={canStack(selected)} canFavorite={canFavorite(selected, activeVersion)} onPatch={patchSelected} onRemove={removeSelected} onCopy={() => setClipboard({ item: selectedItem, source: selected, mode: "copy" })} onMove={() => setClipboard({ item: selectedItem, source: selected, mode: "move" })} onPaste={paste} pasteLabel={clipboard && !sameLocation(clipboard.source, selected) ? itemName(clipboard.item.itemId) : null} />
              </div>
            ) : view === "catalog" ? <ItemBrowser targetLabel={targetLabel} acceptItem={(item) => acceptsItem(selected, item)} onChoose={chooseItem} onBack={catalogReturnView ? () => { setView(catalogReturnView); setCatalogReturnView(null); } : undefined} />
              : view === "overview" ? <CharacterPanel character={editor.character} version={activeVersion} onChange={applyCharacterChange} />
              : view === "effects" ? <EffectsPanel effects={editor.effects} onChange={(effects, description, location) => applySystemChange({ effects }, description, location)} />
              : view === "journey" ? <JourneyPanel journey={editor.journey} difficulty={editor.character.difficulty} onChange={(journey, description, location) => applySystemChange({ journey }, description, location)} />
              : view === "spawns" ? <SpawnPointsPanel points={editor.spawnPoints} onChange={(spawnPoints, description, location) => applySystemChange({ spawnPoints }, description, location)} />
              : view === "backups" ? <BackupsPanel playerPath={currentPlayer.path} playerName={currentPlayer.character.name} refreshKey={currentPlayer.sourceHash} hasUnsavedChanges={editor.changes.length > 0} onRestored={restored} />
              : <SettingsPanel version={version} updateStatus={updateStatus} checkingUpdates={checkingUpdates} automaticUpdateChecks={automaticUpdateChecks} onAutomaticUpdateChecks={changeAutomaticUpdateChecks} onCheckForUpdates={runUpdateCheck} />}
            </div>

            <footer className="border-t border-white/[0.08] bg-[#111513]">
              {(error || message || clipboard) && <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} className={`flex items-start gap-2 border-b border-white/[0.06] px-4 py-2 text-[11px] ${error ? "text-rose-300/84" : "text-white/42"}`}>{error ? <Warning className="mt-px size-3.5 shrink-0" /> : <Check className="mt-px size-3.5 shrink-0 text-emerald-300/70" />}<span className="truncate">{error ?? (clipboard ? `${clipboard.mode === "move" ? "Moving" : "Copied"} ${itemName(clipboard.item.itemId)} from ${locationLabel(clipboard.source)}. Select a destination and paste.` : message)}</span></div>}
              <div className="grid min-h-[58px] grid-cols-[208px_minmax(0,1fr)]"><div aria-live="polite" className={`flex items-center gap-2 border-r border-white/[0.08] px-4 text-[11px] font-medium ${editor.changes.length ? "text-amber-300/82" : "text-white/34"}`}><Stack className="size-4" />{editor.changes.length ? `${editor.changes.length} unsaved ${editor.changes.length === 1 ? "change" : "changes"}` : "No unsaved changes"}</div><div className="flex min-w-0 items-center gap-5 overflow-hidden px-4">{editor.changes.length ? editor.changes.slice(-3).reverse().map((change) => <div key={change.id} className="min-w-0 border-l border-white/10 pl-3"><p className="truncate text-[11px] text-white/52">{change.description}</p><p className="mt-0.5 font-mono text-[9px] text-white/22">{change.location}</p></div>) : <p className="text-[11px] text-white/26">Every edit appears here and can be undone before save.</p>}</div></div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
