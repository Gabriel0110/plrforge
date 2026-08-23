import { MapPin, Plus, Trash } from "@phosphor-icons/react";
import type { SpawnPoint } from "../types";

type Props = {
  points: SpawnPoint[];
  onChange: (points: SpawnPoint[], description: string, location: string) => void;
};

const inputClass = "mt-1.5 h-9 w-full rounded-lg border border-white/[0.09] bg-black/20 px-3 text-[12px] text-white/72 focus:border-emerald-300/40";

export function SpawnPointsPanel({ points, onChange }: Props) {
  const patchPoint = (index: number, patch: Partial<SpawnPoint>, description: string) => {
    onChange(points.map((point, candidate) => candidate === index ? { ...point, ...patch } : point), description, `Spawn points · ${index + 1}`);
  };
  const add = () => {
    const next = [...points, { x: 0, y: 0, worldId: 0, worldName: "New World" }];
    onChange(next, "Spawn point added", `Spawn points · ${next.length}`);
  };

  return (
    <main className="min-h-0 overflow-y-auto px-7 py-6">
      <div className="mx-auto max-w-[1040px]">
        <div className="flex items-end justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/65">Named bed spawns</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white/92">Spawn points</h1><p className="mt-2 max-w-[68ch] text-sm leading-6 text-white/38">Each record ties tile coordinates to an exact world ID and saved world name. Incorrect coordinates can place the character in an unsafe or invalid location, so numeric values are never guessed.</p></div><button type="button" onClick={add} disabled={points.length >= 199} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-[12px] font-semibold text-[#07110d] hover:bg-emerald-400 disabled:opacity-30"><Plus className="size-4" />Add spawn point</button></div>

        <div className="mt-6 space-y-3">{points.length ? points.map((point, index) => <article key={index} className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-5"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-300/[0.05] text-emerald-300/70"><MapPin className="size-[18px]" /></div><div className="min-w-0 flex-1"><p className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/28">Record {index + 1}</p><h2 className="mt-1 truncate text-[15px] font-semibold text-white/82">{point.worldName || "Unnamed world"}</h2></div><button type="button" aria-label={`Remove spawn point ${index + 1}`} onClick={() => onChange(points.filter((_, candidate) => candidate !== index), `Spawn point for ${point.worldName} removed`, `Spawn points · ${index + 1}`)} className="grid size-9 place-items-center rounded-lg text-white/28 hover:bg-rose-400/[0.08] hover:text-rose-300"><Trash className="size-4" /></button></div><div className="mt-4 grid grid-cols-4 gap-3"><label className="col-span-2 text-[10px] text-white/38">World name<input aria-label={`Spawn ${index + 1} world name`} value={point.worldName} onChange={(event) => patchPoint(index, { worldName: event.target.value.slice(0, 1024) }, "Spawn world name changed")} className={inputClass} /></label><label className="col-span-2 text-[10px] text-white/38">World ID<input aria-label={`Spawn ${index + 1} world ID`} type="number" min={-2147483648} max={2147483647} value={point.worldId} onChange={(event) => patchPoint(index, { worldId: int32(event.target.value) }, "Spawn world ID changed")} className={`${inputClass} font-mono`} /></label><label className="col-span-2 text-[10px] text-white/38">Tile X<input aria-label={`Spawn ${index + 1} X coordinate`} type="number" min={-2147483648} max={2147483647} value={point.x} onChange={(event) => patchPoint(index, { x: Math.max(-2147483648, Math.min(2147483647, int32(event.target.value) === -1 ? 0 : int32(event.target.value))) }, "Spawn X coordinate changed")} className={`${inputClass} font-mono`} /></label><label className="col-span-2 text-[10px] text-white/38">Tile Y<input aria-label={`Spawn ${index + 1} Y coordinate`} type="number" min={-2147483648} max={2147483647} value={point.y} onChange={(event) => patchPoint(index, { y: int32(event.target.value) }, "Spawn Y coordinate changed")} className={`${inputClass} font-mono`} /></label></div></article>) : <div className="grid min-h-[340px] place-items-center rounded-xl border border-dashed border-white/[0.09] bg-white/[0.015] text-center"><div><MapPin className="mx-auto size-7 text-white/18" /><h2 className="mt-4 text-base font-semibold text-white/58">No named spawn points</h2><p className="mt-2 max-w-sm text-[11px] leading-5 text-white/28">The character will use the world's default spawn. Add a record only when you know the target world's ID and tile coordinates.</p></div></div>}</div>
      </div>
    </main>
  );
}

function int32(value: string) {
  return Math.max(-2147483648, Math.min(2147483647, Number(value) || 0));
}
