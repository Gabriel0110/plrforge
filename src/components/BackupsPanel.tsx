import {
  ArrowCounterClockwise,
  CircleNotch,
  ClockCounterClockwise,
  FolderOpen,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import {
  isDesktop,
  listBackups,
  restoreBackup,
  revealBackup,
  type BackupEntry,
  type RestoreReceipt,
} from "../lib/native";

type BackupsPanelProps = {
  playerPath: string;
  playerName: string;
  refreshKey: string;
  hasUnsavedChanges: boolean;
  onRestored: (receipt: RestoreReceipt) => Promise<void> | void;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function BackupsPanel({
  playerPath,
  playerName,
  refreshKey,
  hasUnsavedChanges,
  onRestored,
}: BackupsPanelProps) {
  const desktop = isDesktop();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(desktop);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBackups(await listBackups(playerPath));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [playerPath]);

  useEffect(() => {
    if (desktop) void refresh();
  }, [desktop, refresh, refreshKey]);

  const reveal = async (backup: BackupEntry) => {
    setError(null);
    try {
      await revealBackup(playerPath, backup.path);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const restore = async (backup: BackupEntry) => {
    setRestoring(backup.path);
    setError(null);
    try {
      const receipt = await restoreBackup(playerPath, backup.path);
      await onRestored(receipt);
      setConfirming(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setRestoring(null);
    }
  };

  return (
    <main className="min-h-0 overflow-y-auto px-7 py-6">
      <div className="mx-auto max-w-[920px]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-300/75">
              <ClockCounterClockwise className="size-4" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em]">Recovery history</span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.035em] text-white/92">Backups</h1>
            <p className="mt-1 max-w-xl text-[12px] leading-5 text-white/40">
              PlrForge keeps the original character before every save and restore. Backups shown here belong only to {playerName}.
            </p>
          </div>
          {desktop && (
            <button type="button" onClick={() => void refresh()} disabled={loading} className="toolbar-button gap-2 px-3">
              {loading ? <CircleNotch className="size-4 animate-spin" /> : <ArrowCounterClockwise className="size-4" />}
              Refresh
            </button>
          )}
        </div>

        {hasUnsavedChanges && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-[11px] leading-5 text-amber-100/68">
            <Warning className="mt-0.5 size-4 shrink-0 text-amber-300/72" />
            Save or undo the current editor changes before restoring a backup. This prevents two versions of the character from being mixed together.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.04] px-4 py-3 text-[11px] leading-5 text-rose-100/72">
            <Warning className="mt-0.5 size-4 shrink-0" />{error}
          </div>
        )}

        {!desktop ? (
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.025] p-8 text-center">
            <ShieldCheck className="mx-auto size-6 text-emerald-300/60" />
            <p className="mt-3 text-[13px] font-medium text-white/72">Backups are created by the desktop app</p>
            <p className="mt-1 text-[11px] text-white/34">The browser preview never reads or writes local player files.</p>
          </div>
        ) : loading && backups.length === 0 ? (
          <div className="mt-6 space-y-2" aria-label="Loading backups">
            {[0, 1, 2].map((row) => <div key={row} className="skeleton h-[92px]" />)}
          </div>
        ) : backups.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-white/[0.1] p-10 text-center">
            <ShieldCheck className="mx-auto size-6 text-white/24" />
            <p className="mt-3 text-[13px] font-medium text-white/62">No backups yet</p>
            <p className="mt-1 text-[11px] text-white/30">Your first verified save will preserve the current .plr file here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {backups.map((backup) => {
              const isConfirming = confirming === backup.path;
              const isRestoring = restoring === backup.path;
              return (
                <article key={backup.path} className={`rounded-xl border px-4 py-3 transition ${isConfirming ? "border-amber-300/20 bg-amber-300/[0.035]" : "border-white/[0.075] bg-white/[0.022]"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`grid size-9 shrink-0 place-items-center rounded-lg border ${backup.compatible ? "border-emerald-300/12 bg-emerald-300/[0.045] text-emerald-300/72" : "border-rose-300/12 bg-rose-300/[0.04] text-rose-300/68"}`}>
                      {backup.compatible ? <ShieldCheck className="size-[18px]" /> : <Warning className="size-[18px]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-medium text-white/76">{formatDate(backup.modifiedAt)}</p>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${backup.compatible ? "bg-emerald-300/[0.07] text-emerald-200/60" : "bg-rose-300/[0.07] text-rose-200/64"}`}>{backup.compatible ? "Verified" : "Unavailable"}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[9px] text-white/28">{backup.fileName} · {formatSize(backup.size)}{backup.version ? ` · v${backup.version}` : ""}</p>
                      {!backup.compatible && <p className="mt-1 truncate text-[9px] text-rose-200/52">{backup.detail}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={() => void reveal(backup)} className="toolbar-button gap-2 px-3 text-[11px]"><FolderOpen className="size-4" />Reveal</button>
                      <button type="button" onClick={() => setConfirming(isConfirming ? null : backup.path)} disabled={!backup.compatible || hasUnsavedChanges || restoring !== null} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-[11px] font-medium text-white/58 transition hover:bg-white/[0.05] hover:text-white/82 disabled:text-white/18"><ArrowCounterClockwise className="size-4" />Restore</button>
                    </div>
                  </div>
                  {isConfirming && (
                    <div className="mt-3 flex items-center gap-4 border-t border-white/[0.07] pt-3">
                      <p className="min-w-0 flex-1 text-[10px] leading-4 text-amber-100/58">Close Terraria first. The current player file will be preserved as a new pre-restore backup before this version replaces it.</p>
                      <button type="button" onClick={() => setConfirming(null)} disabled={isRestoring} className="h-8 rounded-lg px-3 text-[10px] text-white/42 hover:bg-white/[0.04] hover:text-white/70">Cancel</button>
                      <button type="button" onClick={() => void restore(backup)} disabled={isRestoring} className="inline-flex h-8 items-center gap-2 rounded-lg bg-amber-300 px-3 text-[10px] font-semibold text-[#171208] transition hover:bg-amber-200 disabled:opacity-50">
                        {isRestoring && <CircleNotch className="size-3.5 animate-spin" />}{isRestoring ? "Restoring" : "Restore this backup"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
