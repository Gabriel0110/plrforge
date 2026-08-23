import {
  ArrowSquareOut,
  Check,
  CircleNotch,
  GithubLogo,
  ImagesSquare,
  Info,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useGameAssets } from "../lib/assets";
import { openReleasePage, type UpdateStatus } from "../lib/native";

type SettingsPanelProps = {
  version: string;
  updateStatus: UpdateStatus | null;
  checkingUpdates: boolean;
  automaticUpdateChecks: boolean;
  onAutomaticUpdateChecks: (enabled: boolean) => void;
  onCheckForUpdates: () => Promise<void> | void;
};

function StatusIcon({ status }: { status: UpdateStatus | null }) {
  if (!status) return <Info className="size-4 text-white/34" />;
  if (status.state === "updateAvailable") return <ArrowSquareOut className="size-4 text-sky-300/76" />;
  if (status.state === "upToDate") return <Check className="size-4 text-emerald-300/76" />;
  if (status.state === "error") return <Warning className="size-4 text-rose-300/76" />;
  return <Info className="size-4 text-white/38" />;
}

export function SettingsPanel({
  version,
  updateStatus,
  checkingUpdates,
  automaticUpdateChecks,
  onAutomaticUpdateChecks,
  onCheckForUpdates,
}: SettingsPanelProps) {
  const { status: assets, locate } = useGameAssets();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const openRelease = async () => {
    if (!updateStatus?.releaseUrl) return;
    setOpening(true);
    setOpenError(null);
    try {
      await openReleasePage(updateStatus.releaseUrl);
    } catch (reason) {
      setOpenError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setOpening(false);
    }
  };

  return (
    <main className="min-h-0 overflow-y-auto px-7 py-6">
      <div className="mx-auto max-w-[820px]">
        <div className="flex items-center gap-2 text-emerald-300/75"><ShieldCheck className="size-4" /><span className="font-mono text-[9px] uppercase tracking-[0.16em]">Local-first controls</span></div>
        <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.035em] text-white/92">Settings</h1>
        <p className="mt-1 text-[12px] leading-5 text-white/40">Control local game assets and how PlrForge checks for published releases.</p>

        <section className="mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.022]">
          <div className="flex items-start gap-4 p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-sky-300/12 bg-sky-300/[0.04] text-sky-200/70"><ImagesSquare className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-semibold text-white/78">Terraria artwork</h2>
              <p className="mt-1 text-[11px] leading-5 text-white/38">Icons are extracted from your own Terraria installation and cached locally. Game files are never uploaded.</p>
              <div className="mt-3 rounded-lg border border-white/[0.065] bg-black/10 px-3 py-2">
                <p className="text-[10px] text-white/52">{assets.message}</p>
                {assets.sourcePath && <p className="mt-1 truncate font-mono text-[9px] text-white/25" title={assets.sourcePath}>{assets.sourcePath}</p>}
                {assets.state === "ready" && <p className="mt-1 font-mono text-[9px] text-emerald-200/48">{assets.itemCount.toLocaleString()} item icons · {assets.buffCount.toLocaleString()} buff icons</p>}
              </div>
            </div>
            {assets.state !== "preview" && <button type="button" onClick={() => void locate()} disabled={assets.state === "preparing"} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.09] px-3 text-[11px] font-medium text-white/56 transition hover:bg-white/[0.05] hover:text-white/80 disabled:text-white/20">{assets.state === "preparing" && <CircleNotch className="size-3.5 animate-spin" />}{assets.state === "ready" ? "Change folder" : "Locate Terraria"}</button>}
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.022]">
          <div className="flex items-start gap-4 p-5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] text-white/58"><GithubLogo className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-semibold text-white/78">Application updates</h2>
              <p className="mt-1 text-[11px] leading-5 text-white/38">Installed version {version}. Checks read the latest public GitHub Release; PlrForge never downloads or installs an update without you.</p>
              <div aria-live="polite" className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.065] bg-black/10 px-3 py-2.5">
                <StatusIcon status={updateStatus} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] leading-4 text-white/52">{updateStatus?.message ?? "No update check has been run yet."}</p>
                  {updateStatus?.publishedAt && <p className="mt-1 font-mono text-[9px] text-white/25">Published {new Date(updateStatus.publishedAt).toLocaleDateString()}</p>}
                </div>
              </div>
              {openError && <p role="alert" className="mt-2 text-[10px] text-rose-300/70">{openError}</p>}
              <label className="mt-4 flex cursor-pointer items-center gap-3 text-[11px] text-white/48">
                <input type="checkbox" checked={automaticUpdateChecks} onChange={(event) => onAutomaticUpdateChecks(event.target.checked)} className="size-3.5 accent-emerald-500" />
                Check automatically when PlrForge starts
              </label>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" onClick={() => void onCheckForUpdates()} disabled={checkingUpdates} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[0.09] px-3 text-[11px] font-medium text-white/58 transition hover:bg-white/[0.05] hover:text-white/82 disabled:text-white/20">{checkingUpdates && <CircleNotch className="size-3.5 animate-spin" />}{checkingUpdates ? "Checking" : "Check now"}</button>
              {updateStatus?.state === "updateAvailable" && updateStatus.releaseUrl && <button type="button" onClick={() => void openRelease()} disabled={opening} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-300 px-3 text-[11px] font-semibold text-[#071116] transition hover:bg-sky-200 disabled:opacity-50"><ArrowSquareOut className="size-3.5" />View release</button>}
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.022] p-5">
          <div className="flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-emerald-300/12 bg-emerald-300/[0.04] text-emerald-200/68"><ShieldCheck className="size-5" /></div>
            <div><h2 className="text-[13px] font-semibold text-white/78">Private by design</h2><p className="mt-1 text-[11px] leading-5 text-white/38">Character editing, validation, backups, and game-art extraction happen on this computer. The only optional network request is the GitHub release check above.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
