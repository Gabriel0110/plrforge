import { Gauge, Sparkle, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { items } from "../data/catalog";
import type { CatalogItem, JourneyDocument } from "../types";
import { ItemSearch } from "./ItemSearch";

type Props = {
  journey: JourneyDocument;
  difficulty: number;
  onChange: (journey: JourneyDocument, description: string, location: string) => void;
};

const byKey = new Map(items.filter((item) => item.key).map((item) => [item.key!, item]));

export function JourneyPanel({ journey, difficulty, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    return journey.research.filter((entry) => {
      const item = byKey.get(entry.persistentId);
      return !normalized || `${entry.persistentId} ${item?.name ?? ""}`.toLowerCase().includes(normalized);
    }).slice(0, 250);
  }, [filter, journey.research]);

  const commit = (next: JourneyDocument, description: string, location: string) => onChange(next, description, location);
  const chooseItem = (item: CatalogItem) => {
    if (!item.key) return;
    const existing = journey.research.find((entry) => entry.persistentId === item.key);
    const research = existing
      ? journey.research.map((entry) => entry.persistentId === item.key ? { ...entry, count: 9999 } : entry)
      : [...journey.research, { persistentId: item.key, count: 9999 }];
    commit({ ...journey, research }, `${item.name} research completed`, "Journey · Research");
    setQuery("");
  };
  const updatePower = (id: number, patch: Partial<JourneyDocument["powers"]>, description: string) => {
    const serializedPowerIds = journey.serializedPowerIds.includes(id) ? journey.serializedPowerIds : [...journey.serializedPowerIds, id];
    commit({ ...journey, serializedPowerIds, powers: { ...journey.powers, ...patch } }, description, "Journey · Personal powers");
  };

  return (
    <main className="min-h-0 overflow-y-auto px-7 py-6">
      <div className="mx-auto max-w-[1040px]">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/65">Journey character data</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white/92">Research and personal powers</h1><p className="mt-2 max-w-[70ch] text-sm leading-6 text-white/38">Research is stored by Terraria's persistent item key. A count of 9999 safely exceeds every v325 sacrifice requirement and is clamped by the game to its effective unlock threshold.</p></div>
        {difficulty !== 3 && <div className="mt-5 rounded-xl border border-amber-300/14 bg-amber-300/[0.035] px-4 py-3 text-[11px] leading-5 text-amber-100/58">This character is not currently Journey mode. Terraria preserves research records, but it resets personal Journey powers when a non-Journey character loads.</div>}

        <section className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
          <div className="mb-4 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-emerald-300/[0.05] text-emerald-300/72"><Gauge className="size-[18px]" /></div><div><h2 className="text-[16px] font-semibold text-white/86">Personal Journey powers</h2><p className="mt-0.5 text-[11px] text-white/32">These three records are serialized per player; world-wide time, weather, and difficulty powers live in the world file and remain out of scope.</p></div></div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" role="switch" aria-checked={journey.powers.godmode} onClick={() => updatePower(5, { godmode: !journey.powers.godmode }, `Godmode ${journey.powers.godmode ? "disabled" : "enabled"}`)} className={`flex items-center gap-3 rounded-lg border p-4 text-left ${journey.powers.godmode ? "border-emerald-300/18 bg-emerald-300/[0.045]" : "border-white/[0.07] bg-black/10"}`}><Toggle enabled={journey.powers.godmode} /><span><span className="block text-[12px] font-medium text-white/78">Godmode</span><span className="mt-1 block text-[10px] text-white/30">Damage immunity for this player</span></span></button>
            <button type="button" role="switch" aria-checked={journey.powers.farPlacementRange} onClick={() => updatePower(11, { farPlacementRange: !journey.powers.farPlacementRange }, `Extended placement range ${journey.powers.farPlacementRange ? "disabled" : "enabled"}`)} className={`flex items-center gap-3 rounded-lg border p-4 text-left ${journey.powers.farPlacementRange ? "border-emerald-300/18 bg-emerald-300/[0.045]" : "border-white/[0.07] bg-black/10"}`}><Toggle enabled={journey.powers.farPlacementRange} /><span><span className="block text-[12px] font-medium text-white/78">Extended placement range</span><span className="mt-1 block text-[10px] text-white/30">Infinite block placement reach</span></span></button>
          </div>
          <label className="mt-4 block rounded-lg border border-white/[0.07] bg-black/10 p-4 text-[11px] text-white/42"><span className="flex justify-between"><span>Enemy spawn-rate slider</span><span className="font-mono text-white/68">{journey.powers.spawnRate.toFixed(2)} · {spawnRateLabel(journey.powers.spawnRate)}</span></span><input aria-label="Journey enemy spawn rate" type="range" min={0} max={1} step={0.01} value={journey.powers.spawnRate} onChange={(event) => updatePower(14, { spawnRate: Number(event.target.value) }, "Enemy spawn rate changed")} className="mt-3 w-full accent-emerald-400" /><span className="mt-2 flex justify-between font-mono text-[9px] text-white/24"><span>Disabled</span><span>Normal</span><span>10×</span></span></label>
          <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" role="switch" aria-checked={journey.unlockedSuperCart} onClick={() => commit({ ...journey, unlockedSuperCart: !journey.unlockedSuperCart }, `Super Cart unlock ${journey.unlockedSuperCart ? "cleared" : "set"}`, "Journey · Super Cart")} className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-black/10 p-4 text-left"><Toggle enabled={journey.unlockedSuperCart} /><span className="text-[12px] text-white/70">Super Cart unlocked</span></button><button type="button" role="switch" aria-checked={journey.enabledSuperCart} onClick={() => commit({ ...journey, enabledSuperCart: !journey.enabledSuperCart }, `Super Cart ${journey.enabledSuperCart ? "disabled" : "enabled"}`, "Journey · Super Cart")} className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-black/10 p-4 text-left"><Toggle enabled={journey.enabledSuperCart} /><span className="text-[12px] text-white/70">Super Cart enabled</span></button></div>
        </section>

        <section className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
          <div className="flex items-end justify-between gap-5"><div><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-emerald-300/[0.05] text-emerald-300/72"><Sparkle className="size-[18px]" /></div><div><h2 className="text-[16px] font-semibold text-white/86">Item research</h2><p className="mt-0.5 text-[11px] text-white/32">{journey.research.length.toLocaleString()} persistent research records</p></div></div></div><button type="button" disabled={!journey.research.length} onClick={() => commit({ ...journey, research: journey.research.map((entry) => ({ ...entry, count: 9999 })) }, "All tracked research completed", "Journey · Research")} className="h-9 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.04] px-3 text-[11px] font-medium text-emerald-200/70 hover:bg-emerald-300/[0.08]">Complete all tracked</button></div>
          <div className="relative z-10 mt-5"><ItemSearch query={query} onQueryChange={setQuery} onChoose={chooseItem} targetLabel="Set research to 9999" /></div>
          <input aria-label="Filter tracked research" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter tracked research…" className="mt-3 h-9 w-full rounded-lg border border-white/[0.08] bg-black/15 px-3 text-[12px] text-white/70 placeholder:text-white/24" />
          <div className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.07]">{visible.length ? visible.map((entry) => { const item = byKey.get(entry.persistentId); return <div key={entry.persistentId} className="grid grid-cols-[minmax(0,1fr)_130px_38px] items-center gap-3 bg-black/10 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-white/72">{item?.name ?? entry.persistentId}</p><p className="mt-0.5 truncate font-mono text-[9px] text-white/27">{entry.persistentId}{item ? ` · Item ${item.id}` : ""}</p></div><input aria-label={`${item?.name ?? entry.persistentId} research count`} type="number" min={0} max={9999} value={entry.count} onChange={(event) => { const count = Math.min(9999, Math.max(0, Number(event.target.value) || 0)); commit({ ...journey, research: journey.research.map((candidate) => candidate.persistentId === entry.persistentId ? { ...candidate, count } : candidate) }, `${item?.name ?? entry.persistentId} research changed`, "Journey · Research"); }} className="h-8 rounded-md border border-white/[0.08] bg-black/20 px-2.5 font-mono text-[11px] text-white/65" /><button type="button" aria-label={`Remove ${item?.name ?? entry.persistentId} research`} onClick={() => commit({ ...journey, research: journey.research.filter((candidate) => candidate.persistentId !== entry.persistentId) }, `${item?.name ?? entry.persistentId} research removed`, "Journey · Research")} className="grid size-8 place-items-center rounded-md text-white/24 hover:bg-rose-400/[0.08] hover:text-rose-300"><Trash className="size-4" /></button></div>; }) : <p className="p-6 text-center text-sm text-white/35">No tracked research matches this filter.</p>}</div>
          {journey.research.length > visible.length && <p className="mt-3 text-center text-[10px] text-white/25">Showing the first {visible.length} matching records. Refine the filter to locate another entry.</p>}
        </section>
      </div>
    </main>
  );
}

function Toggle({ enabled }: { enabled: boolean }) {
  return <span className={`relative h-5 w-9 shrink-0 rounded-full ${enabled ? "bg-emerald-400/65" : "bg-white/10"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white/90 transition ${enabled ? "left-[18px]" : "left-0.5"}`} /></span>;
}

function spawnRateLabel(value: number) {
  if (value === 0) return "no spawns";
  const multiplier = value < 0.5 ? 0.1 + value / 0.5 * 0.9 : 1 + (value - 0.5) / 0.5 * 9;
  return `${multiplier.toFixed(2)}×`;
}
