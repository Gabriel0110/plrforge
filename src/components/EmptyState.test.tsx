import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiscoveredPlayer } from "../types";
import { EmptyState } from "./EmptyState";

const player = (patch: Partial<DiscoveredPlayer> = {}): DiscoveredPlayer => ({
  path: "/Players/Hero.plr",
  name: "Hero",
  version: 325,
  modifiedAt: 0,
  compatibility: {
    state: "supported",
    fileVersion: 325,
    formatLabel: "Terraria 1.4.5.x / player v325",
    canEdit: true,
    message: "Verified by the v325 codec.",
  },
  ...patch,
});

describe("EmptyState", () => {
  it("labels verified local players and loads the selected path", () => {
    const load = vi.fn();
    render(<EmptyState players={[player()]} onOpen={vi.fn()} onLoad={load} />);

    expect(screen.getByText("Verified")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Hero.*Verified.*File version 325/ }));
    expect(load).toHaveBeenCalledWith("/Players/Hero.plr");
  });

  it("explains why a historical player still needs a fixture", () => {
    const historical = player({
      path: "/Players/OldHero.plr",
      name: "OldHero",
      version: 279,
      compatibility: {
        state: "untested",
        fileVersion: 279,
        formatLabel: "Historical Terraria player v279",
        canEdit: false,
        message: "Player v279 has not passed PlrForge's golden-fixture suite.",
      },
    });
    render(<EmptyState players={[historical]} onOpen={vi.fn()} onLoad={vi.fn()} />);

    expect(screen.getByText("Needs fixture")).toBeTruthy();
    expect(screen.getByText(/has not passed PlrForge's golden-fixture suite/)).toBeTruthy();
  });

  it("marks a newer format as requiring an app update", () => {
    const newer = player({
      version: 326,
      compatibility: {
        state: "unsupported",
        fileVersion: 326,
        formatLabel: "Newer Terraria player v326",
        canEdit: false,
        message: "Player v326 is newer than PlrForge's latest verified format.",
      },
    });
    render(<EmptyState players={[newer]} onOpen={vi.fn()} onLoad={vi.fn()} />);

    expect(screen.getByText("Update needed")).toBeTruthy();
    expect(screen.getByText(/newer than PlrForge's latest verified format/)).toBeTruthy();
  });
});
