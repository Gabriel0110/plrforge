import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderUpdateButton } from "./HeaderUpdateButton";

describe("HeaderUpdateButton", () => {
  it("runs a manual update check from the header", () => {
    const check = vi.fn();
    render(<HeaderUpdateButton status={null} checking={false} onCheck={check} />);
    fireEvent.click(screen.getByRole("button", { name: "Check for Updates" }));
    expect(check).toHaveBeenCalledOnce();
  });

  it("shows the result of the latest check", () => {
    const { rerender } = render(<HeaderUpdateButton status={null} checking onCheck={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Checking" })).toBeTruthy();

    rerender(<HeaderUpdateButton status={{ state: "upToDate", currentVersion: "0.1.0", latestVersion: "0.1.0", releaseName: null, releaseUrl: null, publishedAt: null, message: "PlrForge is current." }} checking={false} onCheck={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Up to date" })).toBeTruthy();
  });
});
