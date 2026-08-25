import { Check, MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findItem, prefixes } from "../data/catalog";
import { useGameAssets } from "../lib/assets";
import {
  modifierEffectLabels,
  modifierEffects,
  modifierFamily,
  modifierFamilyLabels,
  modifierQuality,
  modifierResultStats,
  type ModifierEffectKey,
  type ModifierFamily,
  type ModifierQuality,
} from "../lib/modifiers";
import type { GameItemMetadata } from "../lib/native";
import type { CatalogItem } from "../types";
import { ItemGlyph } from "./ItemGlyph";

type Props = {
  open: boolean;
  itemId: number;
  itemName: string;
  currentPrefix: number;
  onApply: (prefix: number) => void;
  onClose: () => void;
};

type QualityFilter = "all" | ModifierQuality;
type CompatibilityFilter = "compatible" | "all";

const qualityLabels: Record<ModifierQuality, string> = {
  positive: "Positive",
  mixed: "Tradeoff",
  negative: "Negative",
  neutral: "Neutral",
};

const qualityClasses: Record<ModifierQuality, string> = {
  positive: "border-emerald-300/18 bg-emerald-300/[0.06] text-emerald-200/72",
  mixed: "border-amber-300/18 bg-amber-300/[0.055] text-amber-200/72",
  negative: "border-rose-300/18 bg-rose-300/[0.055] text-rose-200/72",
  neutral: "border-white/10 bg-white/[0.035] text-white/42",
};

function fallbackCompatible(metadata: GameItemMetadata | null, catalogItem: CatalogItem | undefined, family: ModifierFamily) {
  if (!metadata) {
    if (catalogItem?.isAccessory) return family === "accessory";
    if (catalogItem?.isRackable) return family !== "accessory";
    return false;
  }
  if (family === "accessory") return metadata.accessory === true;
  if (family === "melee" || family === "yoyo") return metadata.melee === true;
  if (family === "ranged") return metadata.ranged === true;
  if (family === "magic") return metadata.magic === true;
  if (family === "summon") return metadata.summon === true;
  return (metadata.damage ?? 0) > 0 && metadata.accessory !== true;
}

function valueChange(metadata: GameItemMetadata | null) {
  const multiplier = metadata?.prefixValueMultiplier;
  if (multiplier === undefined || Math.abs(multiplier - 1) < 0.0005) return null;
  const amount = Math.round(Math.abs(multiplier - 1) * 100);
  return `${multiplier > 1 ? "+" : "−"}${amount}% item value`;
}

export function ModifierBrowser({ open, itemId, itemName, currentPrefix, onApply, onClose }: Props) {
  const { itemMetadata, itemVariant, prefetchItemMetadata, metadataVersion } = useGameAssets();
  const baseMetadata = itemMetadata(itemId, 0);
  const catalogItem = findItem(itemId);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const prefetchRef = useRef(prefetchItemMetadata);
  closeRef.current = onClose;
  prefetchRef.current = prefetchItemMetadata;
  const [query, setQuery] = useState("");
  const [quality, setQuality] = useState<QualityFilter>("all");
  const [compatibility, setCompatibility] = useState<CompatibilityFilter>("compatible");
  const [family, setFamily] = useState<"all" | ModifierFamily>("all");
  const [effect, setEffect] = useState<"all" | ModifierEffectKey>("all");
  const [previewPrefix, setPreviewPrefix] = useState(currentPrefix);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setQuality("all");
    setCompatibility("compatible");
    setFamily("all");
    setEffect("all");
    setPreviewPrefix(currentPrefix);
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    void prefetchRef.current(prefixes.filter((prefix) => prefix.id > 0).map((prefix) => ({ id: itemId, prefix: prefix.id })));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [currentPrefix, itemId, open]);

  const rows = useMemo(() => prefixes.map((prefix) => {
    const variant = prefix.id === 0 ? { state: "ready" as const, metadata: baseMetadata } : itemVariant(itemId, prefix.id);
    const prefixFamily = prefix.id === 0 ? "universal" : modifierFamily(prefix.id);
    const exactCompatibility = prefix.id === 0 || variant.state === "ready";
    const compatible = variant.state === "unavailable"
      ? prefix.id === 0 || fallbackCompatible(baseMetadata, catalogItem, prefixFamily)
      : exactCompatibility;
    const effects = prefix.id === 0 ? [] : modifierEffects(prefix.id, variant.state === "ready" ? variant.metadata : null);
    return {
      ...prefix,
      family: prefixFamily,
      state: variant.state,
      metadata: variant.metadata,
      compatible,
      effects,
      quality: modifierQuality(effects),
    };
  }), [baseMetadata, catalogItem, itemId, itemVariant]);

  const availableFamilies = useMemo(() => [...new Set(rows.filter((row) => row.id > 0 && (compatibility === "all" || row.compatible)).map((row) => row.family))], [compatibility, rows]);
  const availableEffects = useMemo(() => [...new Set(rows.flatMap((row) => row.effects.map((entry) => entry.key)))], [rows]);
  const loading = rows.some((row) => row.id > 0 && (row.state === "unresolved" || row.state === "loading"));
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rows
    .filter((row) => compatibility === "all" || row.compatible)
    .filter((row) => family === "all" || row.family === family)
    .filter((row) => quality === "all" || row.quality === quality)
    .filter((row) => effect === "all" || row.effects.some((entry) => entry.key === effect))
    .filter((row) => !normalizedQuery || row.name.toLowerCase().includes(normalizedQuery) || row.effects.some((entry) => entry.label.toLowerCase().includes(normalizedQuery)))
    .sort((left, right) => {
      if (left.id === currentPrefix) return -1;
      if (right.id === currentPrefix) return 1;
      const qualityRank: Record<ModifierQuality, number> = { positive: 0, mixed: 1, neutral: 2, negative: 3 };
      if (qualityRank[left.quality] !== qualityRank[right.quality]) return qualityRank[left.quality] - qualityRank[right.quality];
      const leftValue = left.metadata?.prefixValueMultiplier ?? 1;
      const rightValue = right.metadata?.prefixValueMultiplier ?? 1;
      if (leftValue !== rightValue) return rightValue - leftValue;
      return left.name.localeCompare(right.name);
    });
  const preview = rows.find((row) => row.id === previewPrefix) ?? rows[0];
  const resultStats = modifierResultStats(baseMetadata, preview.metadata);
  const previewValue = valueChange(preview.metadata);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/58 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modifier-browser-title" className="absolute inset-y-0 right-0 grid w-[min(780px,calc(100vw-36px))] grid-rows-[auto_auto_minmax(0,1fr)] border-l border-white/12 bg-[#101513] shadow-[-32px_0_90px_-28px_rgba(0,0,0,.95)]">
        <header className="flex items-center gap-4 border-b border-white/[0.08] px-6 py-5">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.025]"><ItemGlyph itemId={itemId} /></div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-300/58">Modifier browser</p>
            <h2 id="modifier-browser-title" className="mt-1 truncate text-[18px] font-semibold tracking-[-0.025em] text-white/92">Choose a modifier for {itemName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modifier browser" className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/48 transition hover:bg-white/[0.06] hover:text-white/78 active:scale-[0.96]"><X className="size-4" /></button>
        </header>

        <div className="space-y-3 border-b border-white/[0.08] px-6 py-4">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names or effects…" aria-label="Search modifiers" className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.025] pl-9 pr-3 text-sm text-white/86 outline-none transition placeholder:text-white/24 focus:border-emerald-300/42 focus:bg-white/[0.04]" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Compatibility" className="flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
              {(["compatible", "all"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={compatibility === value} onClick={() => setCompatibility(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium transition ${compatibility === value ? "bg-white/[0.09] text-white/82" : "text-white/34 hover:text-white/60"}`}>{value === "compatible" ? "Compatible" : "All prefixes"}</button>)}
            </div>
            <select aria-label="Modifier family" value={family} onChange={(event) => setFamily(event.target.value as "all" | ModifierFamily)} className="h-8 rounded-lg border border-white/10 bg-[#151a18] px-2.5 text-[10px] text-white/62 outline-none focus:border-emerald-300/42">
              <option value="all">All item types</option>
              {availableFamilies.map((value) => <option key={value} value={value}>{modifierFamilyLabels[value]}</option>)}
            </select>
            <select aria-label="Modifier effect" value={effect} onChange={(event) => setEffect(event.target.value as "all" | ModifierEffectKey)} className="h-8 rounded-lg border border-white/10 bg-[#151a18] px-2.5 text-[10px] text-white/62 outline-none focus:border-emerald-300/42">
              <option value="all">All stat effects</option>
              {availableEffects.map((value) => <option key={value} value={value}>{modifierEffectLabels[value]}</option>)}
            </select>
          </div>
          <div role="radiogroup" aria-label="Modifier quality" className="flex flex-wrap gap-1.5">
            {(["all", "positive", "mixed", "negative"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={quality === value} onClick={() => setQuality(value)} className={`rounded-md border px-2.5 py-1.5 text-[9px] font-medium transition ${quality === value ? value === "all" ? "border-emerald-300/28 bg-emerald-300/[0.08] text-emerald-200/78" : qualityClasses[value] : "border-white/[0.07] text-white/32 hover:border-white/14 hover:text-white/58"}`}>{value === "all" ? "Any quality" : qualityLabels[value]}</button>)}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_290px]">
          <div className="min-h-0 overflow-y-auto border-r border-white/[0.08] p-3">
            <div className="mb-2 flex items-center justify-between px-2"><p className="text-[10px] text-white/34">{loading ? "Reading compatible modifiers from Terraria…" : `${filtered.length} ${filtered.length === 1 ? "modifier" : "modifiers"}`}</p>{metadataVersion && <p className="font-mono text-[8px] text-white/20">Terraria {metadataVersion}</p>}</div>
            {loading && filtered.length <= 1 ? <div aria-label="Loading modifier compatibility" className="space-y-2 px-2 py-1">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.035]" />)}</div> : filtered.length ? (
              <div role="listbox" aria-label="Available modifiers" className="space-y-1">
                {filtered.map((row) => {
                  const selected = preview.id === row.id;
                  const current = currentPrefix === row.id;
                  return <button key={row.id} type="button" role="option" aria-selected={selected} aria-disabled={!row.compatible} onMouseEnter={() => setPreviewPrefix(row.id)} onFocus={() => setPreviewPrefix(row.id)} onClick={() => setPreviewPrefix(row.id)} className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${selected ? "border-emerald-300/24 bg-emerald-300/[0.065]" : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.03]"} ${row.compatible ? "" : "opacity-32"}`}>
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${current ? "border-emerald-300/38 bg-emerald-300/[0.12] text-emerald-200" : "border-white/10 text-transparent"}`}>{current && <Check weight="bold" className="size-3" />}</span>
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-[12px] font-medium text-white/78">{row.name}</span>{row.id > 0 && <span className={`rounded border px-1.5 py-0.5 text-[7px] font-medium ${qualityClasses[row.quality]}`}>{qualityLabels[row.quality]}</span>}</span><span className="mt-1 block truncate text-[9px] text-white/28">{row.id === 0 ? "Remove the current modifier" : row.effects.length ? row.effects.map((entry) => entry.label).join(" · ") : modifierFamilyLabels[row.family]}</span></span>
                    <span className="font-mono text-[8px] text-white/18">{row.id || "—"}</span>
                  </button>;
                })}
              </div>
            ) : <div className="mx-2 mt-8 rounded-xl border border-dashed border-white/10 px-5 py-8 text-center"><SlidersHorizontal className="mx-auto size-5 text-white/24" /><p className="mt-3 text-xs text-white/52">No modifiers match these filters.</p><button type="button" onClick={() => { setQuery(""); setQuality("all"); setFamily("all"); setEffect("all"); }} className="mt-2 text-[10px] font-medium text-emerald-300/70 hover:text-emerald-200">Clear filters</button></div>}
          </div>

          <aside className="flex min-h-0 flex-col overflow-y-auto bg-white/[0.012] p-5" aria-label="Modifier preview">
            <p className="font-mono text-[8px] font-medium uppercase tracking-[0.14em] text-white/26">Live preview</p>
            <div className="mt-3 flex items-start justify-between gap-3"><div><h3 className="text-[17px] font-semibold tracking-[-0.02em] text-white/88">{preview.name}</h3><p className="mt-1 text-[9px] text-white/34">{preview.id === 0 ? "No modifier" : modifierFamilyLabels[preview.family]}</p></div>{preview.id > 0 && <span className={`rounded-md border px-2 py-1 text-[8px] font-medium ${qualityClasses[preview.quality]}`}>{qualityLabels[preview.quality]}</span>}</div>
            {preview.effects.length > 0 ? <div className="mt-5 space-y-1.5">{preview.effects.map((entry) => <div key={`${entry.key}-${entry.label}`} className={`rounded-md border px-2.5 py-2 text-[10px] ${entry.beneficial ? "border-emerald-300/12 bg-emerald-300/[0.035] text-emerald-100/66" : "border-rose-300/12 bg-rose-300/[0.035] text-rose-100/66"}`}>{entry.label}</div>)}</div> : <p className="mt-5 text-[10px] leading-5 text-white/34">{preview.id === 0 ? "The item will use its base stats." : preview.state === "unavailable" ? "Exact stat changes appear here when the desktop app reads your installed Terraria data." : preview.compatible ? "This modifier does not change the item stats shown here." : "Terraria does not allow this modifier to roll on this item."}</p>}
            {resultStats.length > 0 && <div className="mt-5 border-t border-white/[0.07] pt-4"><p className="mb-2 text-[9px] font-medium text-white/38">Resulting item stats</p><div className="space-y-2">{resultStats.map((row) => <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-2 text-[9px]"><span className="text-white/36">{row.label}</span><span className="font-mono text-white/26 line-through">{row.base}</span><span className={`font-mono ${row.beneficial ? "text-emerald-200/72" : "text-rose-200/72"}`}>{row.result}</span></div>)}</div></div>}
            {previewValue && <p className="mt-4 border-t border-white/[0.07] pt-3 text-[9px] text-white/34">{previewValue}</p>}
            <div className="mt-auto pt-6">
              {!preview.compatible && <p className="mb-2 text-[9px] leading-4 text-rose-200/58">Not compatible with {itemName}. Switch to “All prefixes” to inspect it, but it cannot be applied.</p>}
              <button type="button" disabled={!preview.compatible || preview.id === currentPrefix} onClick={() => onApply(preview.id)} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 text-[11px] font-semibold text-[#07110d] transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-white/26">{preview.id === currentPrefix ? "Currently applied" : preview.id === 0 ? "Remove modifier" : `Apply ${preview.name}`}</button>
            </div>
          </aside>
        </div>
      </section>
    </div>,
    document.body,
  );
}
