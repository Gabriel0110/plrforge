import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemGlyph } from "./ItemGlyph";

vi.mock("../lib/assets", () => ({
  useGameAssets: () => ({ iconUrl: () => "/cache/items/Item_40.png" }),
}));

describe("ItemGlyph", () => {
  it("preserves intrinsic icon size instead of stretching or clipping the texture", () => {
    const { container } = render(<ItemGlyph itemId={40} large />);
    const viewport = container.querySelector("span");
    const image = container.querySelector("img");

    expect(viewport?.classList.contains("size-16")).toBe(true);
    expect(viewport?.classList.contains("p-1")).toBe(true);
    expect(viewport?.classList.contains("overflow-hidden")).toBe(false);
    for (const className of ["h-auto", "w-auto", "max-h-full", "max-w-full"]) {
      expect(image?.classList.contains(className)).toBe(true);
    }
    expect(image?.classList.contains("h-full")).toBe(false);
    expect(image?.classList.contains("w-full")).toBe(false);
  });
});
