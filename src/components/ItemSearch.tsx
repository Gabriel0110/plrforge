import { Command, MagnifyingGlass, Plus, SquaresFour } from "@phosphor-icons/react";
import { useMemo, useRef } from "react";
import { searchItems } from "../data/catalog";
import type { CatalogItem } from "../types";
import { ItemGlyph } from "./ItemGlyph";
import { ItemTooltip } from "./ItemTooltip";

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  onChoose: (item: CatalogItem) => void;
  targetLabel: string;
  acceptItem?: (item: CatalogItem) => boolean;
  onBrowse?: () => void;
};

export function ItemSearch({ query, onQueryChange, onChoose, targetLabel, acceptItem, onBrowse }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => searchItems(query, acceptItem ? 80 : 8).filter((item) => !acceptItem || acceptItem(item)).slice(0, 8),
    [acceptItem, query],
  );

  return (
    <div className="relative flex gap-2">
      <div className="relative min-w-0 flex-1">
      <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/38" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) onChoose(results[0]);
        }}
        aria-label="Find any item by name or ID"
        placeholder="Find any item by name or ID"
        className="h-11 w-full rounded-xl border border-white/12 bg-white/[0.035] pl-10 pr-20 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-emerald-400/65 focus:bg-white/[0.055] focus:shadow-[inset_0_0_0_1px_rgba(52,211,153,.12)]"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-[10px] text-white/34">
        <Command className="size-3" />K
      </span>
      {query && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-white/12 bg-[#181d1b] shadow-[0_22px_60px_-20px_rgba(0,0,0,.72)]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/34">
            <span>{results.length ? `${results.length} closest matches` : "No catalog match"}</span>
            <span>{targetLabel}</span>
          </div>
          {results.length ? (
            <div className="max-h-[330px] overflow-y-auto p-1.5">
              {results.map((item) => (
                <ItemTooltip key={item.id} itemId={item.id} context="Search result">
                  {(tooltipProps) => <button
                    {...tooltipProps}
                    type="button"
                    onClick={() => onChoose(item)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.065] active:scale-[0.995]"
                  >
                    <ItemGlyph itemId={item.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-white/88">{item.name}</span>
                      <span className="font-mono text-[10px] text-white/34">ID {item.id} · stack limit {item.maxStackSize ?? 9999}</span>
                    </span>
                    <Plus className="size-4 text-emerald-300/80" />
                  </button>}
                </ItemTooltip>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5">
              <p className="text-sm text-white/68">No friendly name found.</p>
              <p className="mt-1 text-xs leading-5 text-white/38">You can still enter a current numeric item ID. Unknown names remain editable so catalog updates never block save compatibility.</p>
            </div>
          )}
        </div>
      )}
      </div>
      {onBrowse && (
        <button
          type="button"
          onClick={onBrowse}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.035] px-4 text-[12px] font-medium text-white/58 transition hover:border-emerald-300/25 hover:bg-emerald-300/[0.055] hover:text-emerald-100/85 active:scale-[0.98]"
        >
          <SquaresFour className="size-4" />Browse items
        </button>
      )}
    </div>
  );
}
