import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoPlayer } from "../lib/demo";
import { InventoryGrid, ItemSlotButton } from "./InventoryGrid";

function iconWrapper(button: HTMLElement) {
  const wrapper = button.querySelector<HTMLElement>(".place-items-center");
  expect(wrapper).not.toBeNull();
  return wrapper!;
}

describe("InventoryGrid", () => {
  it("applies the optical icon lift to hotbar, backpack, currency, and ammo slots", () => {
    render(<InventoryGrid inventory={demoPlayer.inventory} selectedSlot={null} onSelect={vi.fn()} />);

    const slots = screen.getAllByRole("button", { name: /^Slot \d+:/ });
    expect(slots).toHaveLength(58);
    for (const slot of slots) expect(iconWrapper(slot).classList.contains("-translate-y-1")).toBe(true);
  });

  it("does not change shared slots outside the inventory screen by default", () => {
    render(<ItemSlotButton item={demoPlayer.inventory[1]} selected={false} onSelect={vi.fn()} />);

    expect(iconWrapper(screen.getByRole("button", { name: /^Slot 2:/ })).classList.contains("-translate-y-1")).toBe(false);
  });
});
