import { CheckCircle, FileArrowUp, FolderOpen, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import type { DiscoveredPlayer } from "../types";

type Props = {
  players: DiscoveredPlayer[];
  onOpen: () => void;
  onLoad: (path: string) => void;
};

export function EmptyState({ players, onOpen, onLoad }: Props) {
  return (
    <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] overflow-hidden">
      <section className="grid place-items-center p-10">
        <div className="w-full max-w-[560px]">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.07] text-emerald-200"><FileArrowUp className="size-5" /></div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-300/72">Local character editor</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-white/94">Open a player without gambling the save.</h1>
          <p className="mt-4 max-w-[52ch] text-sm leading-6 text-white/44">PlrForge checks compatibility before editing, records every change, and creates a recoverable backup before it writes.</p>
          <button type="button" onClick={onOpen} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-400 active:scale-[0.98]"><FolderOpen weight="bold" className="size-4" />Choose .plr file</button>
          <div className="mt-9 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-xs text-white/34"><ShieldCheck className="size-4 text-emerald-300/60" />Your player file never leaves this computer.</div>
        </div>
      </section>
      <aside className="border-l border-white/[0.08] bg-white/[0.018] p-6">
        <p className="text-xs font-semibold text-white/72">Found on this computer</p>
        <p className="mt-1 text-[11px] leading-5 text-white/32">PlrForge checks the standard Terraria Players folder.</p>
        <div className="mt-5 space-y-2">
          {players.length ? players.map((player) => (
            <button type="button" key={player.path} onClick={() => onLoad(player.path)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-left transition hover:border-white/18 hover:bg-white/[0.05] active:scale-[0.99]">
              <span className="flex items-center justify-between gap-3">
                <span className="block truncate text-sm font-medium text-white/80">{player.name}</span>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${player.compatibility.canEdit ? "border-emerald-300/14 bg-emerald-300/[0.045] text-emerald-200/68" : "border-amber-300/14 bg-amber-300/[0.045] text-amber-200/68"}`}>
                  {player.compatibility.canEdit ? <CheckCircle weight="fill" className="size-3" /> : <WarningCircle weight="fill" className="size-3" />}
                  {player.compatibility.state === "supported" ? "Verified" : player.compatibility.state === "untested" ? "Needs fixture" : "Update needed"}
                </span>
              </span>
              <span className="mt-1 block font-mono text-[10px] text-white/30">File version {player.version}</span>
              {!player.compatibility.canEdit && <span className="mt-1.5 block text-[10px] leading-4 text-amber-100/45">{player.compatibility.message}</span>}
            </button>
          )) : <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs leading-5 text-white/30">No supported local players found yet.</p>}
        </div>
      </aside>
    </main>
  );
}
