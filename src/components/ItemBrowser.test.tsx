import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemBrowser } from "./ItemBrowser";

describe("ItemBrowser", () => {
  it("browses by category and adds compatible items to the carried destination", () => {
    const choose = vi.fn();
    render(<ItemBrowser targetLabel="Inventory 21" acceptItem={() => true} onChoose={choose} />);

    fireEvent.change(screen.getByLabelText("Search item catalog"), { target: { value: "Magic Lantern" } });
    expect(screen.getByText("Magic Lantern")).not.toBeNull();
    fireEvent.click(screen.getByLabelText("Add Magic Lantern to Inventory 21"));
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({ id: 3043 }));
  });

  it("keeps incompatible items visible but prevents inserting them", () => {
    render(<ItemBrowser targetLabel="Head armor" acceptItem={() => false} onChoose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Search item catalog"), { target: { value: "Iron Pickaxe" } });
    expect(screen.getByLabelText("Iron Pickaxe does not fit Head armor").hasAttribute("disabled")).toBe(true);
  });
});
