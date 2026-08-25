import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  CheckCircle,
  MagnifyingGlass,
  Plus,
  SquaresFour,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import {
  catalogCategoryCounts,
  itemCategories,
  itemMatchesCategory,
  items,
} from "../data/catalog";
import type { CatalogItem, ItemCategory } from "../types";
import { ItemGlyph } from "./ItemGlyph";
import { ItemTooltip } from "./ItemTooltip";
import { KeyboardGrid, RovingGroup } from "./KeyboardNavigation";

const PAGE_SIZE = 96;
type SortMode = "id-asc" | "id-desc" | "name-asc" | "name-desc" | "stack-desc";

const rarityTone: Record<string, string> = {
  Common: "text-white/34",
  Gray: "text-white/30",
  Blue: "text-sky-300/70",
  Green: "text-emerald-300/70",
  Orange: "text-orange-300/75",
  LightRed: "text-rose-300/72",
  Pink: "text-pink-300/72",
  LightPurple: "text-violet-300/75",
  Lime: "text-lime-300/72",
  Yellow: "text-yellow-300/75",
  Cyan: "text-cyan-300/75",
  Red: "text-red-300/75",
  Quest: "text-amber-300/75",
  Master: "text-fuchsia-300/75",
  StrongRed: "text-red-200/80",
};

function primaryCategory(item: CatalogItem) {
  return itemCategories.find(({ id }) => id !== "all" && id !== "other" && itemMatchesCategory(item, id))
    ?? itemCategories.find(({ id }) => id === "other")!;
}

type Props = {
  targetLabel: string;
  acceptItem: (item: CatalogItem) => boolean;
  onChoose: (item: CatalogItem) => void;
  onBack?: () => void;
};

export function ItemBrowser({ targetLabel, acceptItem, onChoose, onBack }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ItemCategory>("all");
  const [rarity, setRarity] = useState("all");
  const [sort, setSort] = useState<SortMode>("id-asc");
  const [compatibleOnly, setCompatibleOnly] = useState(false);
  const [page, setPage] = useState(0);

  const counts = useMemo(catalogCategoryCounts, []);
  const rarities = useMemo(
    () => Array.from(new Set(items.map((item) => item.rarity ?? "Common"))).sort((left, right) => left.localeCompare(right)),
    [],
  );
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const numeric = /^\d+$/.test(needle) ? Number(needle) : null;
    return items
      .filter((item) => {
        const matchesQuery = !needle || (numeric !== null
          ? item.id === numeric
          : item.name.toLowerCase().includes(needle) || item.key?.toLowerCase().includes(needle));
        return matchesQuery
          && itemMatchesCategory(item, category)
          && (rarity === "all" || (item.rarity ?? "Common") === rarity)
          && (!compatibleOnly || acceptItem(item));
      })
      .sort((left, right) => {
        if (sort === "id-desc") return right.id - left.id;
        if (sort === "name-asc") return left.name.localeCompare(right.name);
        if (sort === "name-desc") return right.name.localeCompare(left.name);
        if (sort === "stack-desc") return (right.maxStackSize ?? 9999) - (left.maxStackSize ?? 9999) || left.id - right.id;
        return left.id - right.id;
      });
  }, [acceptItem, category, compatibleOnly, query, rarity, sort]);

  useEffect(() => setPage(0), [category, compatibleOnly, query, rarity, sort]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const visible = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const first = results.length ? page * PAGE_SIZE + 1 : 0;
  const last = Math.min((page + 1) * PAGE_SIZE, results.length);
  const firstCompatibleIndex = visible.findIndex((item) => acceptItem(item));

  return (
    <main className="min-h-0 overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              {onBack && <button type="button" onClick={onBack} aria-label="Return to editor" className="grid size-8 place-items-center rounded-lg border border-white/[0.08] text-white/38 transition hover:bg-white/[0.05] hover:text-white/72"><ArrowLeft className="size-4" /></button>}
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300/68">Terraria catalog</p>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white/92">Item Catalog</h1>
            <p className="mt-1 text-[12px] text-white/38">Explore {items.length.toLocaleString()} items without needing to know their names first.</p>
          </div>
          <div className="rounded-xl border border-emerald-300/14 bg-emerald-300/[0.035] px-4 py-3 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-200/48">Add destination</p>
            <p className="mt-1 text-[12px] font-medium text-emerald-100/82">{targetLabel}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[190px_minmax(0,1fr)] gap-5">
          <aside className="self-start rounded-xl border border-white/[0.08] bg-white/[0.018] p-2">
            <p className="px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/28">Categories</p>
            <RovingGroup label="Item categories" role="radiogroup" orientation="vertical" activateOnMove className="space-y-0.5">
              {itemCategories.map((entry) => (
                <button
                  type="button"
                  role="radio"
                  data-roving-item=""
                  aria-checked={category === entry.id}
                  tabIndex={category === entry.id ? 0 : -1}
                  key={entry.id}
                  title={entry.description}
                  onClick={() => setCategory(entry.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] transition ${category === entry.id ? "bg-emerald-300/[0.08] font-medium text-emerald-100/84" : "text-white/42 hover:bg-white/[0.04] hover:text-white/68"}`}
                >
                  <span>{entry.label}</span><span className="font-mono text-[9px] text-white/24">{counts[entry.id].toLocaleString()}</span>
                </button>
              ))}
            </RovingGroup>
          </aside>

          <section className="min-w-0">
            <div className="grid grid-cols-[minmax(240px,1fr)_150px_150px_auto] gap-2">
              <label className="relative">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/32" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search item catalog" placeholder="Search names, keys, or item IDs" className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.025] pl-9 pr-3 text-[12px] text-white/82 outline-none placeholder:text-white/25 focus:border-emerald-300/45" />
              </label>
              <select aria-label="Filter by rarity" value={rarity} onChange={(event) => setRarity(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-[#151a18] px-3 text-[11px] text-white/62 outline-none focus:border-emerald-300/45">
                <option value="all">All rarities</option>
                {rarities.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select aria-label="Sort items" value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-10 rounded-lg border border-white/10 bg-[#151a18] px-3 text-[11px] text-white/62 outline-none focus:border-emerald-300/45">
                <option value="id-asc">Item ID · low first</option>
                <option value="id-desc">Item ID · high first</option>
                <option value="name-asc">Name · A–Z</option>
                <option value="name-desc">Name · Z–A</option>
                <option value="stack-desc">Stack limit · high first</option>
              </select>
              <button type="button" role="switch" aria-checked={compatibleOnly} onClick={() => setCompatibleOnly((value) => !value)} className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-[11px] transition ${compatibleOnly ? "border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-100/78" : "border-white/10 bg-white/[0.025] text-white/42 hover:text-white/66"}`}>
                <CheckCircle weight={compatibleOnly ? "fill" : "regular"} className="size-4" />Fits slot
              </button>
            </div>

            <div aria-live="polite" className="mt-3 flex items-center justify-between border-y border-white/[0.06] py-2 text-[10px] text-white/32">
              <span>{results.length.toLocaleString()} {results.length === 1 ? "item" : "items"}</span>
              <span className="font-mono">Showing {first.toLocaleString()}–{last.toLocaleString()}</span>
            </div>

            {visible.length ? (
              <KeyboardGrid label="Catalog items" className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(154px,1fr))] gap-2">
                {visible.map((item, index) => {
                  const fits = acceptItem(item);
                  const group = primaryCategory(item);
                  const itemRarity = item.rarity ?? "Common";
                  return (
                    <ItemTooltip key={item.id} itemId={item.id} context="Item Catalog">
                      {(tooltipProps) => <article {...tooltipProps} className={`group relative flex min-h-[150px] flex-col rounded-xl border p-3 transition ${fits ? "border-white/[0.08] bg-white/[0.022] hover:border-white/16 hover:bg-white/[0.04]" : "border-white/[0.045] bg-black/[0.08] opacity-58"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <ItemGlyph itemId={item.id} large />
                          <span className="font-mono text-[9px] text-white/24">#{item.id}</span>
                        </div>
                        <h2 className="mt-2 line-clamp-2 text-[12px] font-medium leading-4 text-white/78" title={item.name}>{item.name}</h2>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <div className="min-w-0">
                            <p className={`truncate text-[9px] ${rarityTone[itemRarity] ?? "text-white/34"}`}>{itemRarity}</p>
                            <p className="mt-0.5 truncate text-[9px] text-white/25">{group.label} · max {item.maxStackSize ?? 9999}</p>
                          </div>
                          <button type="button" data-keyboard-grid-item="" tabIndex={fits && index === firstCompatibleIndex ? 0 : -1} disabled={!fits} onClick={() => onChoose(item)} aria-label={fits ? `Add ${item.name} to ${targetLabel}` : `${item.name} does not fit ${targetLabel}`} title={fits ? `Add to ${targetLabel}` : `Does not fit ${targetLabel}`} className="grid size-7 shrink-0 place-items-center rounded-lg border border-emerald-300/18 bg-emerald-300/[0.055] text-emerald-200/74 transition hover:bg-emerald-300/[0.12] disabled:border-white/[0.06] disabled:bg-transparent disabled:text-white/16">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </article>}
                    </ItemTooltip>
                  );
                })}
              </KeyboardGrid>
            ) : (
              <div className="mt-3 grid min-h-64 place-items-center rounded-xl border border-dashed border-white/[0.08] bg-black/[0.08] text-center">
                <div><SquaresFour className="mx-auto size-7 text-white/18" /><p className="mt-3 text-sm text-white/48">No items match these filters</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setRarity("all"); setCompatibleOnly(false); }} className="mt-2 text-[11px] font-medium text-emerald-300/70">Reset browser</button></div>
              </div>
            )}

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 border-t border-white/[0.06] pt-4">
                <button type="button" aria-label="Previous catalog page" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="grid size-8 place-items-center rounded-lg border border-white/[0.08] text-white/46 hover:bg-white/[0.04] disabled:text-white/14"><CaretLeft className="size-4" /></button>
                <span className="min-w-28 text-center font-mono text-[10px] text-white/34">Page {page + 1} of {pageCount}</span>
                <button type="button" aria-label="Next catalog page" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} className="grid size-8 place-items-center rounded-lg border border-white/[0.08] text-white/46 hover:bg-white/[0.04] disabled:text-white/14"><CaretRight className="size-4" /></button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
