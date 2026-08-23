import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackupsPanel } from "./BackupsPanel";

const listBackups = vi.fn();
const restoreBackup = vi.fn();
const revealBackup = vi.fn();

vi.mock("../lib/native", () => ({
  isDesktop: () => true,
  listBackups: (...args: unknown[]) => listBackups(...args),
  restoreBackup: (...args: unknown[]) => restoreBackup(...args),
  revealBackup: (...args: unknown[]) => revealBackup(...args),
}));

const backup = {
  path: "/players/.plrforge-backups/NewBruv-20260823.plr",
  fileName: "NewBruv-20260823.plr",
  size: 4096,
  modifiedAt: "2026-08-23T16:00:00Z",
  characterName: "NewBruv",
  version: 325,
  compatible: true,
  detail: "Verified Terraria v325 backup",
};

describe("BackupsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBackups.mockResolvedValue([backup]);
    restoreBackup.mockResolvedValue({
      safetyBackupPath: "/players/.plrforge-backups/NewBruv-pre-restore.plr",
      restoredAt: "2026-08-23T17:00:00Z",
    });
  });

  it("requires confirmation and reports a completed restore", async () => {
    const restored = vi.fn();
    render(<BackupsPanel playerPath="/players/NewBruv.plr" playerName="NewBruv" refreshKey="hash" hasUnsavedChanges={false} onRestored={restored} />);

    expect(await screen.findByText("NewBruv-20260823.plr", { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.getByText("Close Terraria first.", { exact: false })).toBeTruthy();
    expect(restoreBackup).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Restore this backup" }));
    await waitFor(() => expect(restoreBackup).toHaveBeenCalledWith("/players/NewBruv.plr", backup.path));
    await waitFor(() => expect(restored).toHaveBeenCalledOnce());
  });

  it("blocks restore while the editor has unsaved changes", async () => {
    render(<BackupsPanel playerPath="/players/NewBruv.plr" playerName="NewBruv" refreshKey="hash" hasUnsavedChanges onRestored={vi.fn()} />);
    expect(await screen.findByText("Save or undo", { exact: false })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Restore" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
