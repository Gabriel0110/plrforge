import type { ItemLocation, StorageDocument, StorageKey } from "../types";
import { ItemSlotButton } from "./InventoryGrid";

const storageTabs: { key: StorageKey; label: string; detail: string }[] = [
  { key: "piggyBank", label: "Piggy Bank", detail: "Personal portable storage" },
  { key: "safe", label: "Safe", detail: "Personal secure storage" },
  { key: "defendersForge", label: "Defender's Forge", detail: "Expanded personal storage" },
  { key: "voidVault", label: "Void Vault", detail: "Supports favorites" },
];

type Props = {
  storage: StorageDocument;
  container: StorageKey;
  selected: ItemLocation;
  onContainer: (container: StorageKey) => void;
  onSelect: (location: ItemLocation) => void;
};

export function StoragePanel({ storage, container, selected, onContainer, onSelect }: Props) {
  const current = storageTabs.find((entry) => entry.key === container)!;
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300/68">Personal storage</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-white/90">{current.label}</h1>
          <p className="mt-1 text-[11px] text-white/34">{current.detail}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1">
          {storageTabs.map((entry) => (
            <button type="button" key={entry.key} onClick={() => onContainer(entry.key)} className={`rounded-md px-2.5 py-1.5 text-[11px] transition ${container === entry.key ? "bg-white/[0.09] text-white/84" : "text-white/34 hover:text-white/62"}`}>{entry.label}</button>
          ))}
        </div>
      </div>
      <section className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
        <div className="grid grid-cols-10 gap-2">
          {storage[container].map((item) => (
            <ItemSlotButton
              key={item.slot}
              item={item}
              selected={selected.area === "storage" && selected.storage === container && selected.slot === item.slot}
              onSelect={() => onSelect({ area: "storage", storage: container, slot: item.slot })}
            />
          ))}
        </div>
      </section>
      <p className="mt-4 text-[11px] leading-5 text-white/30">Piggy Bank, Safe, and Defender's Forge do not serialize favorite flags in v325. Void Vault does, and PlrForge preserves it.</p>
    </div>
  );
}
