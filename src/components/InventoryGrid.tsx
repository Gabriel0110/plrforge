import { HeartStraight, Star } from "@phosphor-icons/react";
import { itemName } from "../data/catalog";
import type { InventoryItem } from "../types";
import { ItemGlyph } from "./ItemGlyph";

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
}: {
  item: InventoryItem;
  selected: boolean;
  onSelect: () => void;
  label?: string;
  showIndex?: boolean;
}) {
  const name = itemName(item.itemId);
  return (
    <button
      type="button"
      aria-label={`${label ?? `Slot ${item.slot + 1}`}: ${name}${item.stack > 1 ? `, stack ${item.stack}` : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={`group relative aspect-square min-w-0 rounded-lg border p-1.5 text-left transition duration-200 ease-out active:scale-[0.98] ${
        selected
          ? "border-emerald-400/80 bg-emerald-400/10 shadow-[inset_0_0_0_1px_rgba(52,211,153,.22)]"
          : item.itemId > 0
            ? "border-white/14 bg-white/[0.045] hover:border-white/28 hover:bg-white/[0.075]"
            : "border-white/[0.08] bg-white/[0.018] hover:border-white/18"
      }`}
    >
      {showIndex && <span className="absolute left-1.5 top-1 font-mono text-[9px] text-white/25">{item.slot + 1}</span>}
      <span className="grid size-full place-items-center pt-1">
        <ItemGlyph itemId={item.itemId} />
      </span>
      {item.stack > 1 && (
        <span className="absolute bottom-1 right-1.5 rounded bg-[#121615]/80 px-1 font-mono text-[10px] text-white/80">
          {item.stack}
        </span>
      )}
      {item.favorited && <Star weight="fill" className="absolute right-1 top-1 size-3 text-amber-300" />}
    </button>
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
      <div className={`grid gap-1.5 ${compact ? "grid-cols-4 max-w-[268px]" : "grid-cols-10"}`}>
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
      <SlotSection title="Main inventory" detail="Slots 1–50" items={inventory.slice(0, 50)} selectedSlot={selectedSlot} onSelect={onSelect} />
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
