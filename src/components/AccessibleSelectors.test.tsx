import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoPlayer } from "../lib/demo";
import { LoadoutsPanel } from "./LoadoutsPanel";
import { StoragePanel } from "./StoragePanel";

describe("accessible panel selectors", () => {
  it("exposes loadouts as tabs and activates the next loadout with an arrow key", () => {
    const onLoadout = vi.fn();
    render(
      <LoadoutsPanel
        equipment={demoPlayer.equipment}
        loadout={0}
        selected={{ area: "loadoutArmor", loadout: 0, slot: 0 }}
        onLoadout={onLoadout}
        onSelect={vi.fn()}
        onVisibility={vi.fn()}
        onMiscVisibility={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[1]);
    expect(onLoadout).toHaveBeenCalledWith(1);
  });

  it("exposes storage containers as tabs and keeps one tab stop in the item grid", () => {
    const onContainer = vi.fn();
    render(
      <StoragePanel
        storage={demoPlayer.storage}
        container="piggyBank"
        selected={{ area: "storage", storage: "piggyBank", slot: 0 }}
        onContainer={onContainer}
        onSelect={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(onContainer).toHaveBeenCalledWith("safe");

    const slots = Array.from(screen.getByRole("group", { name: /Piggy Bank item slots/ }).querySelectorAll<HTMLButtonElement>("button"));
    expect(slots.filter((slot) => slot.tabIndex === 0)).toHaveLength(1);
  });
});
