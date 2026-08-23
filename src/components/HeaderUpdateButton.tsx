import { ArrowsClockwise, Check, CircleNotch, DownloadSimple } from "@phosphor-icons/react";
import type { UpdateStatus } from "../lib/native";

type HeaderUpdateButtonProps = {
  status: UpdateStatus | null;
  checking: boolean;
  onCheck: () => Promise<void> | void;
};

export function HeaderUpdateButton({ status, checking, onCheck }: HeaderUpdateButtonProps) {
  const available = status?.state === "updateAvailable";
  const current = status?.state === "upToDate";
  const label = checking
    ? "Checking"
    : available
      ? `Update ${status.latestVersion ?? "available"}`
      : current
        ? "Up to date"
        : "Check for Updates";
  const Icon = checking ? CircleNotch : available ? DownloadSimple : current ? Check : ArrowsClockwise;

  return (
    <button
      type="button"
      onClick={() => void onCheck()}
      disabled={checking}
      title={status?.message ?? "Check GitHub Releases for a newer PlrForge version"}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[10px] font-medium transition active:scale-[0.98] disabled:cursor-wait ${available ? "border-sky-300/18 bg-sky-300/[0.07] text-sky-100/80 hover:bg-sky-300/[0.11]" : current ? "border-emerald-300/14 bg-emerald-300/[0.045] text-emerald-100/68 hover:bg-emerald-300/[0.075]" : "border-white/[0.08] bg-white/[0.025] text-white/48 hover:bg-white/[0.055] hover:text-white/76"}`}
    >
      <Icon className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
      <span>{label}</span>
    </button>
  );
}
