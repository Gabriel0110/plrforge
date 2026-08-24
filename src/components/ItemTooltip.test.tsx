import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemTooltip } from "./ItemTooltip";

vi.mock("../lib/assets", () => ({
  useGameAssets: () => ({
    itemMetadata: (id: number, prefix = 0) => id === 2888 ? {
      id,
      name: "The Bee's Knees",
      tooltip: "Wooden arrows turn into a column of bees",
      damage: prefix === 51 ? 24 : 23,
      crit: prefix === 51 ? 2 : 0,
      knockBack: prefix === 51 ? 2.7 : 3,
      useAnimation: prefix === 51 ? 21 : 23,
      value: prefix === 51 ? 116873 : 100000,
      prefix: prefix || undefined,
      ranged: true,
    } : null,
    metadataVersion: "1.4.5.7",
  }),
}));

describe("ItemTooltip", () => {
  it("shows catalog and live stack details on hover and hides them on leave", () => {
    render(
      <ItemTooltip itemId={2888} stack={1} prefix={0} context="Hotbar 2">
        {(props) => <button {...props}>The Bee&apos;s Knees slot</button>}
      </ItemTooltip>,
    );

    const trigger = screen.getByRole("button", { name: "The Bee's Knees slot" });
    fireEvent.mouseEnter(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("The Bee's Knees");
    expect(tooltip.textContent).toContain("Hotbar 2");
    expect(tooltip.textContent).toContain("2888");
    expect(tooltip.textContent).toContain("23 ranged damage");
    expect(tooltip.textContent).toContain("4% critical strike chance");
    expect(tooltip.textContent).toContain("Wooden arrows turn into a column of bees");
    expect(tooltip.textContent).toContain("10 gold");
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens from keyboard focus", () => {
    render(
      <ItemTooltip itemId={2768} stack={1} context="Inventory 20">
        {(props) => <button {...props}>Drill slot</button>}
      </ItemTooltip>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Drill slot" }));
    expect(screen.getByRole("tooltip").textContent).toContain("Drill Containment Unit");
  });

  it("uses Terraria's exact prefix-adjusted values when available", () => {
    render(
      <ItemTooltip itemId={2888} stack={1} prefix={51} context="Hotbar 2">
        {(props) => <button {...props}>Nasty bow slot</button>}
      </ItemTooltip>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Nasty bow slot" }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Nasty The Bee's Knees");
    expect(tooltip.textContent).toContain("24 ranged damage");
    expect(tooltip.textContent).toContain("6% critical strike chance");
    expect(tooltip.textContent).not.toContain("Loading Terraria's exact");
  });
});
