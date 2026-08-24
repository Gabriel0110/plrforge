import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemTooltip } from "./ItemTooltip";

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
});
