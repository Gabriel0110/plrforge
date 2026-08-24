import { describe, expect, it } from "vitest";
import { acceptsItem, catalogCategoryCounts, itemMatchesCategory, searchItems } from "./catalog";

describe("item catalog search", () => {
  it("finds items by exact numeric ID", () => {
    expect(searchItems("2768")[0]).toMatchObject({ id: 2768, name: "Drill Containment Unit" });
  });

  it("prioritizes names that begin with the query", () => {
    expect(searchItems("magic lantern")[0]).toMatchObject({ id: 3043, name: "Magic Lantern" });
  });

  it("filters equipment search by slot capability", () => {
    const helmet = searchItems("iron helmet")[0];
    const pickaxe = searchItems("iron pickaxe")[0];
    expect(acceptsItem({ area: "loadoutArmor", loadout: 0, slot: 0 }, helmet)).toBe(true);
    expect(acceptsItem({ area: "loadoutArmor", loadout: 0, slot: 0 }, pickaxe)).toBe(false);
  });

  it("builds useful browser categories from Terraria catalog metadata", () => {
    expect(itemMatchesCategory(searchItems("iron pickaxe")[0], "rackable")).toBe(true);
    expect(itemMatchesCategory(searchItems("dirt block")[0], "placeables")).toBe(true);
    expect(itemMatchesCategory(searchItems("chlorophyte mask")[0], "armor")).toBe(true);
    expect(catalogCategoryCounts().all).toBeGreaterThan(6_000);
  });
});
