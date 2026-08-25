import { ArrowSquareOut, CaretRight, Copy, ClipboardText, SlidersHorizontal, Star, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { findItem, itemName, prefixes } from "../data/catalog";
import type { InventoryItem } from "../types";
import { ItemGlyph } from "./ItemGlyph";
import { ModifierBrowser } from "./ModifierBrowser";

type Props = {
  item: InventoryItem | null;
  onPatch: (patch: Partial<InventoryItem>, description: string) => void;
  onRemove: () => void;
  slotLabel?: string;
  canStack?: boolean;
  canFavorite?: boolean;
  onCopy?: () => void;
  onMove?: () => void;
  onPaste?: () => void;
  pasteLabel?: string | null;
};

export function ItemInspector({
  item,
  onPatch,
  onRemove,
  slotLabel,
  canStack = true,
  canFavorite = true,
  onCopy,
  onMove,
  onPaste,
  pasteLabel,
}: Props) {
  const [modifierBrowserOpen, setModifierBrowserOpen] = useState(false);

  if (!item) {
    return (
      <aside className="flex min-h-0 flex-col border-l border-white/[0.08] bg-[#111513]/65 p-6">
        <div className="mt-14 border-t border-white/10 pt-5">
          <p className="text-sm font-medium text-white/68">Select an inventory slot</p>
          <p className="mt-2 text-xs leading-5 text-white/36">Its item, stack, modifier, and favorite state will appear here. Nothing changes until you choose an action.</p>
        </div>
      </aside>
    );
  }

  const catalogItem = findItem(item.itemId);
  const name = itemName(item.itemId);
  const empty = item.itemId === 0;
  const maximum = catalogItem?.maxStackSize ?? 9999;

  return (
    <aside className="min-h-0 overflow-y-auto border-l border-white/[0.08] bg-[#111513]/65 p-6">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-300/72">{slotLabel ?? `Slot ${item.slot + 1}`}</p>
      <div className="mt-4 flex items-center gap-4 border-b border-white/[0.08] pb-5">
        <ItemGlyph itemId={item.itemId} large />
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white/92">{name}</h2>
          <p className="mt-1 font-mono text-[11px] text-white/36">Item ID {item.itemId}</p>
        </div>
      </div>

      {empty ? (
        <div className="py-5">
          <p className="text-sm text-white/58">This slot is empty.</p>
          <p className="mt-1.5 text-xs leading-5 text-white/34">Use item search to place something here without affecting another slot.</p>
        </div>
      ) : (
        <div className="space-y-5 py-5">
          {canStack && <div>
            <label htmlFor="item-stack" className="mb-2 block text-xs font-medium text-white/62">Stack</label>
            <div className="grid grid-cols-[42px_1fr_42px] overflow-hidden rounded-lg border border-white/12 bg-white/[0.025]">
              <button type="button" aria-label="Decrease stack" className="grid h-10 place-items-center border-r border-white/10 text-white/48 hover:bg-white/[0.05] active:scale-[0.97]" onClick={() => onPatch({ stack: Math.max(1, item.stack - 1) }, `Stack changed to ${Math.max(1, item.stack - 1)}`)}>−</button>
              <input
                id="item-stack"
                aria-label="Stack"
                type="number"
                min={1}
                max={maximum}
                value={item.stack}
                onChange={(event) => {
                  const value = Math.max(1, Math.min(maximum, Number(event.target.value) || 1));
                  onPatch({ stack: value }, `Stack changed to ${value}`);
                }}
                className="h-10 min-w-0 bg-transparent text-center font-mono text-sm text-white/88 outline-none"
              />
              <button type="button" aria-label="Increase stack" className="grid h-10 place-items-center border-l border-white/10 text-white/48 hover:bg-white/[0.05] active:scale-[0.97]" onClick={() => onPatch({ stack: Math.min(maximum, item.stack + 1) }, `Stack changed to ${Math.min(maximum, item.stack + 1)}`)}>+</button>
            </div>
            <span className="mt-1.5 block font-mono text-[10px] text-white/28">Valid range 1–{maximum}</span>
          </div>}

          <div>
            <span className="mb-2 block text-xs font-medium text-white/62">Modifier</span>
            <button type="button" onClick={() => setModifierBrowserOpen(true)} aria-haspopup="dialog" className="group flex w-full items-center gap-3 rounded-lg border border-white/12 bg-white/[0.022] px-3 py-2.5 text-left transition hover:border-emerald-300/24 hover:bg-emerald-300/[0.035] active:scale-[0.99]">
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.025] text-emerald-200/58"><SlidersHorizontal className="size-3.5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-white/78">{prefixes.find((entry) => entry.id === item.prefix)?.name ?? `Prefix ${item.prefix}`}</span><span className="mt-0.5 block text-[9px] text-white/28">Browse compatible modifiers and preview stats</span></span>
              <CaretRight className="size-3.5 text-white/24 transition group-hover:translate-x-0.5 group-hover:text-white/52" />
            </button>
            <span className="mt-1.5 block text-[10px] text-white/28">Compatibility and effects come from your installed Terraria version.</span>
            <ModifierBrowser
              open={modifierBrowserOpen}
              itemId={item.itemId}
              itemName={name}
              currentPrefix={item.prefix}
              onClose={() => setModifierBrowserOpen(false)}
              onApply={(prefix) => {
                const prefixName = prefixes.find((entry) => entry.id === prefix)?.name ?? `Prefix ${prefix}`;
                onPatch({ prefix }, `Modifier changed to ${prefixName}`);
                setModifierBrowserOpen(false);
              }}
            />
          </div>

          {canFavorite && <div>
            <span className="mb-2 block text-xs font-medium text-white/62">Favorite</span>
            <button
              type="button"
              role="switch"
              aria-checked={item.favorited}
              onClick={() => onPatch({ favorited: !item.favorited }, item.favorited ? "Removed from favorites" : "Marked as favorite")}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2.5 text-left transition hover:bg-white/[0.04] active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 text-xs text-white/62"><Star weight={item.favorited ? "fill" : "regular"} className={item.favorited ? "text-amber-300" : "text-white/34"} />Protect this item in-game</span>
              <span className={`relative h-5 w-9 rounded-full transition ${item.favorited ? "bg-emerald-500/70" : "bg-white/12"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white/90 transition-transform ${item.favorited ? "translate-x-[18px]" : "translate-x-0.5"}`} /></span>
            </button>
          </div>}
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        {!empty && onCopy && <button type="button" onClick={onCopy} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/58 transition hover:bg-white/[0.04]"><Copy className="size-3.5" />Copy</button>}
        {!empty && onMove && <button type="button" onClick={onMove} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/58 transition hover:bg-white/[0.04]"><ArrowSquareOut className="size-3.5" />Move</button>}
        {pasteLabel && onPaste && <button type="button" onClick={onPaste} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] px-3 py-2.5 text-xs text-emerald-200/78 transition hover:bg-emerald-300/[0.08]"><ClipboardText className="size-3.5" />Paste {pasteLabel}</button>}
      </div>

      {!empty && (
        <button type="button" onClick={onRemove} className="flex w-full items-center justify-between rounded-lg border border-rose-400/25 px-3.5 py-2.5 text-xs font-medium text-rose-300/85 transition hover:border-rose-400/45 hover:bg-rose-400/[0.05] active:scale-[0.98]">
          Remove from slot <Trash className="size-4" />
        </button>
      )}
    </aside>
  );
}
