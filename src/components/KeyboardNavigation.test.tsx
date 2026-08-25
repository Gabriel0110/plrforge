import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyboardGrid, RovingGroup } from "./KeyboardNavigation";

describe("KeyboardGrid", () => {
  it("moves one tab stop through a two-dimensional grid with arrow, Home, and End keys", () => {
    render(
      <KeyboardGrid label="Test slots" columns={2}>
        {[1, 2, 3, 4].map((slot, index) => (
          <button key={slot} type="button" data-keyboard-grid-item="" tabIndex={index === 0 ? 0 : -1}>
            Slot {slot}
          </button>
        ))}
      </KeyboardGrid>,
    );

    const slots = screen.getAllByRole("button");
    slots[0].focus();
    fireEvent.keyDown(slots[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(slots[1]);
    expect(slots[1].getAttribute("tabindex")).toBe("0");
    expect(slots[0].getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(slots[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(slots[3]);
    fireEvent.keyDown(slots[3], { key: "Home" });
    expect(document.activeElement).toBe(slots[2]);
    fireEvent.keyDown(slots[2], { key: "End", ctrlKey: true });
    expect(document.activeElement).toBe(slots[3]);
  });
});

describe("RovingGroup", () => {
  it("wraps focus and activates the next selector when arrow keys move", () => {
    const choose = vi.fn();
    render(
      <RovingGroup label="Views" orientation="vertical" activateOnMove>
        <button type="button" data-roving-item="" tabIndex={0} onClick={() => choose("inventory")}>Inventory</button>
        <button type="button" data-roving-item="" tabIndex={-1} onClick={() => choose("catalog")}>Catalog</button>
      </RovingGroup>,
    );

    const inventory = screen.getByRole("button", { name: "Inventory" });
    const catalog = screen.getByRole("button", { name: "Catalog" });
    inventory.focus();
    fireEvent.keyDown(inventory, { key: "ArrowUp" });

    expect(document.activeElement).toBe(catalog);
    expect(choose).toHaveBeenLastCalledWith("catalog");
  });
});
