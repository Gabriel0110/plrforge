import { Flask, MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import rawBuffs from "../data/buffs.json";
import type { BuffSlot, EffectsDocument } from "../types";

type BuffRecord = { id: number; key: string; name: string; description: string };
const buffs = rawBuffs as BuffRecord[];
const byId = new Map(buffs.map((buff) => [buff.id, buff]));

type Props = {
  effects: EffectsDocument;
  onChange: (effects: EffectsDocument, description: string, location: string) => void;
};

function durationLabel(ticks: number) {
  const seconds = Math.max(0, Math.floor(ticks / 60));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function EffectsPanel({ effects, onChange }: Props) {
  const [query, setQuery] = useState("");
  const active = effects.buffs.filter((buff) => buff.buffId !== 0);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const numeric = /^\d+$/.test(normalized) ? Number(normalized) : null;
    return buffs.filter((buff) => numeric !== null ? buff.id === numeric : `${buff.name} ${buff.key}`.toLowerCase().includes(normalized)).slice(0, 10);
  }, [query]);

  const changeSlot = (slot: number, patch: Partial<BuffSlot>, description: string) => {
    onChange({ buffs: effects.buffs.map((buff) => buff.slot === slot ? { ...buff, ...patch, slot } : buff) }, description, `Effects · Slot ${slot + 1}`);
  };
  const addBuff = (record: BuffRecord) => {
    const empty = effects.buffs.find((buff) => buff.buffId === 0);
    if (!empty) return;
    changeSlot(empty.slot, { buffId: record.id, time: 36_000 }, `${record.name} added for 10 minutes`);
    setQuery("");
  };

  return (
    <main className="min-h-0 overflow-y-auto px-7 py-6">
      <div className="mx-auto max-w-[1040px]">
        <div className="flex items-end justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/65">Saved effects</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white/92">Buffs and durations</h1><p className="mt-2 max-w-[68ch] text-sm leading-6 text-white/38">Terraria v325 stores 44 effect slots and measures duration in 60 ticks per second. Transient effects marked no-save by Terraria may be discarded the next time the game saves.</p></div><div className="rounded-lg border border-white/[0.08] bg-black/15 px-3 py-2 text-right"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/28">Slots used</p><p className="mt-1 font-mono text-xs text-white/65">{active.length} / 44</p></div></div>

        <section className="relative mt-6 rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
          <label className="relative block"><MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/36" /><input aria-label="Find a buff by name or ID" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a buff by name or ID" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white/82 placeholder:text-white/28 focus:border-emerald-300/45" /></label>
          {query && <div className="absolute left-5 right-5 top-[72px] z-20 overflow-hidden rounded-xl border border-white/12 bg-[#181d1b] shadow-[0_20px_50px_rgba(0,0,0,.5)]">{results.length ? results.map((record) => <button type="button" key={record.id} disabled={active.length === 44} onClick={() => addBuff(record)} className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-left last:border-0 hover:bg-white/[0.05]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-300/[0.08] font-mono text-[10px] text-violet-200/70">{record.id}</span><span className="min-w-0 flex-1"><span className="block text-[12px] font-medium text-white/80">{record.name}</span><span className="mt-0.5 block truncate text-[10px] text-white/32">{record.description || record.key}</span></span><Plus className="size-4 text-emerald-300/70" /></button>) : <p className="p-4 text-sm text-white/42">No v325 buff matches that name or ID.</p>}</div>}
        </section>

        <section className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.018] p-5">
          <div className="mb-4 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-violet-300/[0.05] text-violet-200/70"><Flask className="size-[18px]" /></div><div><h2 className="text-[16px] font-semibold text-white/86">Active saved effects</h2><p className="mt-0.5 text-[11px] text-white/32">Edit exact ticks or use the quick duration controls.</p></div></div>
          {active.length ? <div className="grid grid-cols-2 gap-3">{active.map((buff) => { const record = byId.get(buff.buffId); return <article key={buff.slot} className="rounded-lg border border-white/[0.075] bg-black/10 p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-300/[0.07] font-mono text-[10px] text-violet-200/70">{buff.buffId}</span><div className="min-w-0 flex-1"><h3 className="truncate text-[13px] font-medium text-white/82">{record?.name ?? `Buff ${buff.buffId}`}</h3><p className="mt-1 truncate text-[10px] text-white/30">{record?.description || `Slot ${buff.slot + 1}`}</p></div><button type="button" aria-label={`Remove ${record?.name ?? `buff ${buff.buffId}`}`} onClick={() => changeSlot(buff.slot, { buffId: 0, time: 0 }, `${record?.name ?? `Buff ${buff.buffId}`} removed`)} className="grid size-8 place-items-center rounded-lg text-white/28 hover:bg-rose-400/[0.08] hover:text-rose-300"><Trash className="size-4" /></button></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-3"><label className="text-[10px] text-white/36">Duration ticks<input aria-label={`${record?.name ?? `Buff ${buff.buffId}`} duration ticks`} type="number" min={1} max={2147483647} value={buff.time} onChange={(event) => changeSlot(buff.slot, { time: Math.min(2147483647, Math.max(1, Number(event.target.value) || 1)) }, `${record?.name ?? `Buff ${buff.buffId}`} duration changed`)} className="mt-1.5 h-9 w-full rounded-lg border border-white/[0.09] bg-black/20 px-3 font-mono text-[12px] text-white/75" /></label><div className="self-end pb-2 font-mono text-[10px] text-white/36">{durationLabel(buff.time)}</div></div><div className="mt-3 flex gap-2">{[{ label: "5m", ticks: 18_000 }, { label: "10m", ticks: 36_000 }, { label: "30m", ticks: 108_000 }].map((option) => <button type="button" key={option.label} onClick={() => changeSlot(buff.slot, { time: option.ticks }, `${record?.name ?? `Buff ${buff.buffId}`} set to ${option.label}`)} className="rounded-md border border-white/[0.07] px-2.5 py-1.5 font-mono text-[9px] text-white/38 hover:bg-white/[0.04] hover:text-white/65">{option.label}</button>)}</div></article>; })}</div> : <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-white/[0.08] bg-black/10 text-center"><div><Flask className="mx-auto size-6 text-white/20" /><p className="mt-3 text-sm text-white/46">No saved effects</p><p className="mt-1 text-[11px] text-white/26">Search above to add one to the first empty slot.</p></div></div>}
        </section>
      </div>
    </main>
  );
}
