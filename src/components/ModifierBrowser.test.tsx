import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModifierBrowser } from "./ModifierBrowser";

const variants = new Map([
  [81, {
    id: 3507,
    prefix: 81,
    requestedPrefix: 81,
    canRollPrefix: true,
    damage: 6,
    useTime: 12,
    knockBack: 4.6,
    prefixDamageMultiplier: 1.15,
    prefixCritBonus: 5,
    prefixSpeedMultiplier: 0.9,
    prefixKnockbackMultiplier: 1.15,
    prefixValueMultiplier: 3.097,
  }],
  [39, {
    id: 3507,
    prefix: 39,
    requestedPrefix: 39,
    canRollPrefix: true,
    damage: 4,
    useTime: 13,
    knockBack: 3.2,
    prefixDamageMultiplier: 0.7,
    prefixKnockbackMultiplier: 0.8,
    prefixValueMultiplier: 0.312,
  }],
  [57, {
    id: 3507,
    prefix: 57,
    requestedPrefix: 57,
    canRollPrefix: true,
    damage: 6,
    useTime: 13,
    knockBack: 3.6,
    prefixDamageMultiplier: 1.18,
    prefixKnockbackMultiplier: 0.9,
    prefixValueMultiplier: 1.126,
  }],
]);

vi.mock("../lib/assets", () => ({
  useGameAssets: () => ({
    iconUrl: () => null,
    itemMetadata: () => ({ id: 3507, name: "Copper Shortsword", damage: 5, useTime: 13, knockBack: 4, melee: true }),
    itemVariant: (_id: number, prefix: number) => variants.has(prefix)
      ? { state: "ready", metadata: variants.get(prefix) }
      : { state: "incompatible", metadata: null },
    prefetchItemMetadata: vi.fn().mockResolvedValue(undefined),
    metadataVersion: "1.4.5.8",
  }),
}));

describe("ModifierBrowser", () => {
  it("filters compatible modifiers by quality and previews exact results", () => {
    render(<ModifierBrowser open itemId={3507} itemName="Copper Shortsword" currentPrefix={0} onApply={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /Choose a modifier for Copper Shortsword/ })).not.toBeNull();
    expect(within(screen.getByRole("listbox", { name: "Available modifiers" })).getAllByRole("option")).toHaveLength(4);
    fireEvent.click(screen.getByRole("radio", { name: "Positive" }));
    expect(within(screen.getByRole("listbox", { name: "Available modifiers" })).getAllByRole("option")).toHaveLength(1);
    fireEvent.mouseEnter(screen.getByRole("option", { name: /Legendary/ }));
    expect(screen.getByLabelText("Modifier preview").textContent).toContain("15% more damage");
    expect(screen.getByLabelText("Modifier preview").textContent).toContain("Damage56");
    expect(screen.getByRole("dialog").textContent).toContain("Terraria 1.4.5.8");
  });

  it("searches effects and applies the previewed compatible modifier", () => {
    const onApply = vi.fn();
    render(<ModifierBrowser open itemId={3507} itemName="Copper Shortsword" currentPrefix={0} onApply={onApply} onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Search modifiers" }), { target: { value: "less knockback" } });
    expect(within(screen.getByRole("listbox", { name: "Available modifiers" })).getAllByRole("option")).toHaveLength(2);
    fireEvent.click(screen.getByRole("option", { name: /Ruthless/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply Ruthless" }));
    expect(onApply).toHaveBeenCalledWith(57);
  });

  it("shows incompatible prefixes for inspection without allowing them to be applied", () => {
    render(<ModifierBrowser open itemId={3507} itemName="Copper Shortsword" currentPrefix={0} onApply={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: "All prefixes" }));
    const warding = screen.getByRole("option", { name: /Warding/ });
    expect(warding.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(warding);
    expect(screen.getByLabelText("Modifier preview").textContent).toContain("Not compatible with Copper Shortsword");
  });
});
