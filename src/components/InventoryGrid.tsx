import { Backpack, HeartStraight, Lightning, Star } from "@phosphor-icons/react";
import { itemName } from "../data/catalog";
import type { InventoryItem } from "../types";
import { ItemGlyph } from "./ItemGlyph";
import { ItemTooltip } from "./ItemTooltip";

type Props = {
  inventory: InventoryItem[];
  selectedSlot: number | null;
  onSelect: (slot: number) => void;
};

export function ItemSlotButton({
  item,
  selected,
  onSelect,
  label,
  showIndex = true,
  hotbar = false,
}: {
  item: InventoryItem;
  selected: boolean;
  onSelect: () => void;
  label?: string;
  showIndex?: boolean;
  hotbar?: boolean;
}) {
  const name = itemName(item.itemId);
  return (
    <ItemTooltip itemId={item.itemId} stack={item.stack} prefix={item.prefix} favorited={item.favorited} context={label ?? `${hotbar ? "Hotbar" : "Slot"} ${item.slot + 1}`}>
      {(tooltipProps) => <button
        {...tooltipProps}
        type="button"
        aria-label={`${label ?? `Slot ${item.slot + 1}`}: ${name}${item.stack > 1 ? `, stack ${item.stack}` : ""}`}
        aria-pressed={selected}
        onClick={onSelect}
        className={`group relative aspect-square min-w-0 overflow-hidden rounded-lg border p-1 text-left transition duration-200 ease-out active:scale-[0.98] ${
          selected
            ? "border-emerald-400/80 bg-emerald-400/10 shadow-[inset_0_0_0_1px_rgba(52,211,153,.22)]"
            : item.itemId > 0
              ? hotbar
                ? "border-emerald-200/20 bg-emerald-300/[0.045] hover:border-emerald-200/38 hover:bg-emerald-300/[0.075]"
                : "border-white/14 bg-white/[0.045] hover:border-white/28 hover:bg-white/[0.075]"
              : hotbar
                ? "border-emerald-200/12 bg-emerald-300/[0.025] hover:border-emerald-200/28"
                : "border-white/[0.08] bg-white/[0.018] hover:border-white/18"
        }`}
      >
        {hotbar && <span className="absolute inset-x-2 top-0 h-px bg-emerald-300/40" />}
        {showIndex && <span className={`absolute left-1.5 top-1 font-mono text-[8px] ${hotbar ? "text-emerald-100/42" : "text-white/25"}`}>{item.slot + 1}</span>}
        <span className="grid size-full place-items-center">
          <ItemGlyph itemId={item.itemId} slot />
        </span>
        {item.stack > 1 && (
          <span className="absolute bottom-1 right-1.5 rounded bg-[#121615]/80 px-1 font-mono text-[10px] text-white/80">
            {item.stack}
          </span>
        )}
        {item.favorited && <Star weight="fill" className="absolute right-1 top-1 size-3 text-amber-300" />}
      </button>}
    </ItemTooltip>
  );
}

function SlotSection({
  title,
  detail,
  items,
  selectedSlot,
  onSelect,
  compact = false,
}: {
  title: string;
  detail: string;
  items: InventoryItem[];
  selectedSlot: number | null;
  onSelect: (slot: number) => void;
  compact?: boolean;
}) {
  return (
    <section aria-labelledby={`${title}-title`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <h2 id={`${title}-title`} className="text-[13px] font-semibold text-white/88">{title}</h2>
        <p className="text-[11px] text-white/38">{detail}</p>
      </div>
      <div className={`grid gap-1.5 ${compact ? "grid-cols-4 max-w-[254px]" : "grid-cols-10 max-w-[694px]"}`}>
        {items.map((item) => (
          <ItemSlotButton key={item.slot} item={item} selected={item.slot === selectedSlot} onSelect={() => onSelect(item.slot)} />
        ))}
      </div>
    </section>
  );
}

export function InventoryGrid({ inventory, selectedSlot, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="main-inventory-title">
        <div className="mb-2.5 flex max-w-[694px] items-baseline justify-between gap-4">
          <h2 id="main-inventory-title" className="text-[13px] font-semibold text-white/88">Main inventory</h2>
          <p className="text-[11px] text-white/38">Slots 1–50</p>
        </div>

        <div className="max-w-[706px] rounded-xl border border-emerald-300/13 bg-emerald-300/[0.018] p-1.5 shadow-[inset_0_1px_0_rgba(110,231,183,.04)]">
          <div className="mb-1.5 flex items-center justify-between px-1.5 pt-0.5">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-200/58"><Lightning weight="fill" className="size-3" />Hotbar</span>
            <span className="text-[9px] text-white/26">Quick-access row in Terraria</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {inventory.slice(0, 10).map((item) => (
              <ItemSlotButton key={item.slot} hotbar item={item} selected={item.slot === selectedSlot} onSelect={() => onSelect(item.slot)} />
            ))}
          </div>
        </div>

        <div className="mt-3 max-w-[706px] rounded-xl border border-white/[0.055] bg-black/[0.08] p-1.5">
          <div className="mb-1.5 flex items-center gap-1.5 px-1.5 pt-0.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/30"><Backpack className="size-3" />Backpack</div>
          <div className="grid grid-cols-10 gap-1.5">
            {inventory.slice(10, 50).map((item) => (
              <ItemSlotButton key={item.slot} item={item} selected={item.slot === selectedSlot} onSelect={() => onSelect(item.slot)} />
            ))}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-8 border-t border-white/[0.08] pt-4">
        <SlotSection compact title="Coins" detail="Slots 51–54" items={inventory.slice(50, 54)} selectedSlot={selectedSlot} onSelect={onSelect} />
        <SlotSection compact title="Ammo" detail="Slots 55–58" items={inventory.slice(54, 58)} selectedSlot={selectedSlot} onSelect={onSelect} />
      </div>
      <p className="flex items-center gap-2 text-[11px] text-white/34">
        <HeartStraight className="size-3.5" />
        Empty slots stay untouched until you choose an item.
      </p>
    </div>
  );
}
