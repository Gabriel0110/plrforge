import { Eye, EyeSlash } from "@phosphor-icons/react";
import type { EquipmentDocument, ItemLocation } from "../types";
import { ItemSlotButton } from "./InventoryGrid";

const gearLabels = ["Head", "Body", "Legs", "Accessory 1", "Accessory 2", "Accessory 3", "Accessory 4", "Accessory 5", "Accessory 6", "Accessory 7"];
const vanityLabels = ["Vanity head", "Vanity body", "Vanity legs", "Vanity acc. 1", "Vanity acc. 2", "Vanity acc. 3", "Vanity acc. 4", "Vanity acc. 5", "Vanity acc. 6", "Vanity acc. 7"];
const miscLabels = ["Pet", "Light pet", "Minecart", "Mount", "Hook"];
const loadoutTabs = [
  { id: "loadout-1", index: 0 },
  { id: "loadout-2", index: 1 },
  { id: "loadout-3", index: 2 },
];

function selectedAt(selected: ItemLocation, area: ItemLocation["area"], loadout: number | undefined, slot: number) {
  if (selected.area !== area || selected.slot !== slot) return false;
  return !("loadout" in selected) || selected.loadout === loadout;
}

type Props = {
  equipment: EquipmentDocument;
  loadout: number;
  selected: ItemLocation;
  onLoadout: (index: number) => void;
  onSelect: (location: ItemLocation) => void;
  onVisibility: (loadout: number, slot: number, hidden: boolean) => void;
  onMiscVisibility: (slot: number, hidden: boolean) => void;
};

export function LoadoutsPanel({
  equipment,
  loadout,
  selected,
  onLoadout,
  onSelect,
  onVisibility,
  onMiscVisibility,
}: Props) {
  const active = equipment.loadouts[loadout];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300/68">Equipment sets</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.035em] text-white/90">Loadout {loadout + 1}</h1>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-white/[0.025] p-1">
          {loadoutTabs.map(({ id, index }) => (
            <button
              type="button"
              key={id}
              onClick={() => onLoadout(index)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${loadout === index ? "bg-white/[0.09] text-white/88" : "text-white/36 hover:text-white/66"}`}
            >
              {index + 1}{index === equipment.currentLoadoutIndex ? " · active" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <section className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
          <div className="mb-3 grid grid-cols-[112px_58px_58px_32px] items-center gap-2 text-[9px] font-medium uppercase tracking-[0.12em] text-white/28">
            <span>Gear</span><span className="text-center">Item</span><span className="text-center">Dye</span><span />
          </div>
          <div className="space-y-1.5">
            {gearLabels.map((label, slot) => (
              <div key={label} className="grid grid-cols-[112px_58px_58px_32px] items-center gap-2">
                <span className="truncate text-[11px] text-white/46">{label}</span>
                <ItemSlotButton item={active.armor[slot]} label={`${label} item`} showIndex={false} selected={selectedAt(selected, "loadoutArmor", loadout, slot)} onSelect={() => onSelect({ area: "loadoutArmor", loadout, slot })} />
                <ItemSlotButton item={active.dyes[slot]} label={`${label} dye`} showIndex={false} selected={selectedAt(selected, "loadoutDye", loadout, slot)} onSelect={() => onSelect({ area: "loadoutDye", loadout, slot })} />
                <button type="button" aria-label={active.hidden[slot] ? `Show ${label}` : `Hide ${label}`} onClick={() => onVisibility(loadout, slot, !active.hidden[slot])} className={`grid size-8 place-items-center rounded-md transition ${active.hidden[slot] ? "bg-amber-300/[0.08] text-amber-200/70" : "text-white/24 hover:bg-white/[0.04] hover:text-white/52"}`}>
                  {active.hidden[slot] ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
          <div className="mb-3 grid grid-cols-[124px_58px_1fr] items-center gap-2 text-[9px] font-medium uppercase tracking-[0.12em] text-white/28"><span>Vanity</span><span className="text-center">Item</span><span>Uses matching dye</span></div>
          <div className="space-y-1.5">
            {vanityLabels.map((label, index) => {
              const slot = index + 10;
              return (
                <div key={label} className="grid grid-cols-[124px_58px_1fr] items-center gap-2">
                  <span className="truncate text-[11px] text-white/46">{label}</span>
                  <ItemSlotButton item={active.armor[slot]} label={label} showIndex={false} selected={selectedAt(selected, "loadoutArmor", loadout, slot)} onSelect={() => onSelect({ area: "loadoutArmor", loadout, slot })} />
                  <span className="font-mono text-[9px] text-white/20">Dye {index + 1}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="border-t border-white/[0.08] pt-5">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="text-[13px] font-semibold text-white/82">Companions and movement</h2><p className="text-[10px] text-white/30">Shared across all loadouts</p></div>
        <div className="grid grid-cols-5 gap-3">
          {miscLabels.map((label, slot) => (
            <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.015] p-2.5">
              <div className="mb-2 flex items-center justify-between"><span className="text-[10px] text-white/44">{label}</span><button type="button" aria-label={equipment.miscHidden[slot] ? `Show ${label}` : `Hide ${label}`} onClick={() => onMiscVisibility(slot, !equipment.miscHidden[slot])} className={equipment.miscHidden[slot] ? "text-amber-200/66" : "text-white/22"}>{equipment.miscHidden[slot] ? <EyeSlash className="size-3.5" /> : <Eye className="size-3.5" />}</button></div>
              <div className="grid grid-cols-2 gap-1.5">
                <ItemSlotButton item={equipment.miscEquips[slot]} label={label} showIndex={false} selected={selectedAt(selected, "miscEquip", undefined, slot)} onSelect={() => onSelect({ area: "miscEquip", slot })} />
                <ItemSlotButton item={equipment.miscDyes[slot]} label={`${label} dye`} showIndex={false} selected={selectedAt(selected, "miscDye", undefined, slot)} onSelect={() => onSelect({ area: "miscDye", slot })} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
