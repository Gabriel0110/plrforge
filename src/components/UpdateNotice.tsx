import {
  CheckCircle,
  CircleNotch,
  DownloadSimple,
  Info,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { UpdateStatus } from "../lib/native";

type UpdateNoticeProps = {
  status: UpdateStatus | null;
  checking: boolean;
  onDismiss: () => void;
  onViewRelease: () => Promise<void> | void;
};

type NoticePresentation = {
  title: string;
  message: string;
  Icon: typeof Info;
  tone: string;
};

function presentation(status: UpdateStatus | null, checking: boolean): NoticePresentation | null {
  if (checking) {
    return {
      title: "Checking for updates…",
      message: "Contacting GitHub Releases.",
      Icon: CircleNotch,
      tone: "border-sky-300/15 bg-sky-300/[0.045] text-sky-100",
    };
  }
  if (!status) return null;

  switch (status.state) {
    case "updateAvailable":
      return {
        title: `PlrForge ${status.latestVersion ?? "update"} is available`,
        message: status.message,
        Icon: DownloadSimple,
        tone: "border-sky-300/18 bg-sky-300/[0.055] text-sky-100",
      };
    case "upToDate":
      return {
        title: "You’re up to date",
        message: status.message,
        Icon: CheckCircle,
        tone: "border-emerald-300/16 bg-emerald-300/[0.045] text-emerald-100",
      };
    case "unconfigured":
      return {
        title: "Update checks aren’t configured",
        message: status.message,
        Icon: Info,
        tone: "border-amber-300/16 bg-amber-300/[0.045] text-amber-100",
      };
    case "error":
      return {
        title: "Couldn’t check for updates",
        message: status.message,
        Icon: WarningCircle,
        tone: "border-rose-300/18 bg-rose-300/[0.05] text-rose-100",
      };
    case "preview":
      return {
        title: "Desktop update check",
        message: status.message,
        Icon: Info,
        tone: "border-white/[0.09] bg-white/[0.035] text-white/80",
      };
  }
}

export function UpdateNotice({ status, checking, onDismiss, onViewRelease }: UpdateNoticeProps) {
  const notice = presentation(status, checking);
  if (!notice) return null;

  const { Icon } = notice;
  const canViewRelease = !checking && status?.state === "updateAvailable" && Boolean(status.releaseUrl);

  return (
    <div
      role={!checking && status?.state === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`flex min-h-11 shrink-0 items-center gap-3 border-b px-4 py-2 ${notice.tone}`}
    >
      <Icon className={`size-4 shrink-0 ${checking ? "animate-spin" : ""}`} weight={checking ? "regular" : "fill"} />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-2 gap-y-0.5 max-sm:flex-col max-sm:items-start">
        <p className="shrink-0 text-[11px] font-semibold">{notice.title}</p>
        <p className="truncate text-[10px] text-current/60 max-sm:whitespace-normal">{notice.message}</p>
      </div>
      {canViewRelease && (
        <button
          type="button"
          onClick={() => void onViewRelease()}
          className="shrink-0 rounded-md border border-current/15 bg-current/[0.06] px-2.5 py-1 text-[10px] font-semibold transition hover:bg-current/[0.1] active:scale-[0.98]"
        >
          View release
        </button>
      )}
      {!checking && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss update status"
          className="grid size-7 shrink-0 place-items-center rounded-md text-current/45 transition hover:bg-current/[0.08] hover:text-current/80"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
