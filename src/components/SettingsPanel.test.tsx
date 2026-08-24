import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";

vi.mock("../lib/assets", () => ({
  useGameAssets: () => ({
    status: {
      state: "ready",
      sourcePath: "/Applications/Terraria.app",
      cachePath: "/cache/terraria-assets",
      itemCount: 6000,
      buffCount: 350,
      metadataCount: 5980,
      metadataMessage: "5,980 local item definitions loaded from Terraria 1.4.5.7.",
      message: "Terraria artwork is ready.",
    },
    locate: vi.fn(),
  }),
}));

vi.mock("../lib/native", () => ({ openReleasePage: vi.fn() }));

describe("SettingsPanel", () => {
  it("runs manual checks and persists the automatic-check choice through callbacks", () => {
    const check = vi.fn();
    const automatic = vi.fn();
    render(<SettingsPanel version="0.1.0" updateStatus={null} checkingUpdates={false} automaticUpdateChecks={false} onAutomaticUpdateChecks={automatic} onCheckForUpdates={check} />);

    fireEvent.click(screen.getByRole("button", { name: "Check now" }));
    expect(check).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("checkbox", { name: "Check automatically when PlrForge starts" }));
    expect(automatic).toHaveBeenCalledWith(true);
  });

  it("offers the release page when a newer version exists", () => {
    render(<SettingsPanel version="0.1.0" updateStatus={{ state: "updateAvailable", currentVersion: "0.1.0", latestVersion: "0.2.0", releaseName: "PlrForge 0.2", releaseUrl: "https://github.com/example/plrforge/releases/tag/v0.2.0", publishedAt: "2026-08-23T16:00:00Z", message: "PlrForge 0.2.0 is available." }} checkingUpdates={false} automaticUpdateChecks={false} onAutomaticUpdateChecks={vi.fn()} onCheckForUpdates={vi.fn()} />);
    expect(screen.getByRole("button", { name: "View release" })).toBeTruthy();
  });
});
