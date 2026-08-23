import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UpdateStatus } from "../lib/native";
import { UpdateNotice } from "./UpdateNotice";

const status = (patch: Partial<UpdateStatus>): UpdateStatus => ({
  state: "upToDate",
  currentVersion: "0.1.0",
  latestVersion: "0.1.0",
  releaseName: null,
  releaseUrl: null,
  publishedAt: null,
  message: "PlrForge 0.1.0 is the latest release.",
  ...patch,
});

describe("UpdateNotice", () => {
  it("shows progress while an update check is running", () => {
    render(<UpdateNotice status={null} checking onDismiss={vi.fn()} onViewRelease={vi.fn()} />);

    expect(screen.getByText("Checking for updates…")).toBeTruthy();
    expect(screen.getByText("Contacting GitHub Releases.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dismiss update status" })).toBeNull();
  });

  it("shows a successful result and can be dismissed", () => {
    const dismiss = vi.fn();
    render(<UpdateNotice status={status({})} checking={false} onDismiss={dismiss} onViewRelease={vi.fn()} />);

    expect(screen.getByText("You’re up to date")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss update status" }));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("links to an available release", () => {
    const viewRelease = vi.fn();
    render(
      <UpdateNotice
        status={status({ state: "updateAvailable", latestVersion: "0.2.0", releaseUrl: "https://github.com/example/releases/v0.2.0", message: "A newer version is ready." })}
        checking={false}
        onDismiss={vi.fn()}
        onViewRelease={viewRelease}
      />,
    );

    expect(screen.getByText("PlrForge 0.2.0 is available")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View release" }));
    expect(viewRelease).toHaveBeenCalledOnce();
  });

  it.each([
    ["unconfigured", "Update checks aren’t configured", "Set a GitHub repository before distributing the app."],
    ["error", "Couldn’t check for updates", "GitHub could not be reached."],
    ["preview", "Desktop update check", "GitHub release checks run in the desktop app."],
  ] as const)("shows visible feedback for the %s state", (stateName, title, message) => {
    render(<UpdateNotice status={status({ state: stateName, message })} checking={false} onDismiss={vi.fn()} onViewRelease={vi.fn()} />);

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
  });
});
