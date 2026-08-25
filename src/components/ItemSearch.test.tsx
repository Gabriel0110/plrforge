import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogItem } from "../types";
import { ItemSearch } from "./ItemSearch";

function SearchHarness({ onChoose }: { onChoose: (item: CatalogItem) => void }) {
  const [query, setQuery] = useState("");
  return <ItemSearch query={query} onQueryChange={setQuery} onChoose={onChoose} targetLabel="Inventory 1" />;
}

describe("ItemSearch", () => {
  it("exposes a combobox and chooses the active result without moving focus from the input", () => {
    const choose = vi.fn();
    render(<SearchHarness onChoose={choose} />);
    const input = screen.getByRole("combobox", { name: "Find any item by name or ID" });

    input.focus();
    fireEvent.change(input, { target: { value: "wood" } });
    const options = screen.getAllByRole("option");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(options[0].getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(choose).toHaveBeenCalledTimes(1);
  });

  it("closes its results with Escape", () => {
    render(<SearchHarness onChoose={vi.fn()} />);
    const input = screen.getByRole("combobox", { name: "Find any item by name or ID" });
    fireEvent.change(input, { target: { value: "torch" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect((input as HTMLInputElement).value).toBe("");
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });
});
