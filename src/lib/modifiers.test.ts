import { describe, expect, it } from "vitest";
import { modifierEffects, modifierFamily, modifierQuality, modifierResultStats } from "./modifiers";

describe("modifier metadata", () => {
  it("maps legacy and 1.4.5 modifier families", () => {
    expect(modifierFamily(15)).toBe("melee");
    expect(modifierFamily(61)).toBe("universal");
    expect(modifierFamily(65)).toBe("accessory");
    expect(modifierFamily(84)).toBe("yoyo");
    expect(modifierFamily(85)).toBe("summon");
    expect(modifierFamily(97)).toBe("summon");
  });

  it("describes exact locally extracted weapon changes", () => {
    const effects = modifierEffects(85, {
      id: 1157,
      prefixDamageMultiplier: 1.15,
      prefixKnockbackMultiplier: 1.15,
      prefixSpeedMultiplier: 1,
      prefixScaleMultiplier: 1,
      prefixVelocityMultiplier: 1,
      prefixManaMultiplier: 1,
      prefixTagDamageBonus: 3,
      prefixArmorPenetrationBonus: 10,
    });
    expect(effects.map((effect) => effect.label)).toEqual([
      "15% more damage",
      "15% more knockback",
      "+3 summon tag damage",
      "+10 armor penetration",
    ]);
    expect(modifierQuality(effects)).toBe("positive");
  });

  it("classifies tradeoffs and known accessory effects", () => {
    const mixed = modifierEffects(89, { id: 1157, prefixDamageMultiplier: 0.95, prefixTagDamageBonus: 3 });
    expect(modifierQuality(mixed)).toBe("mixed");
    expect(modifierEffects(65, null)[0].label).toBe("+4 defense");
  });

  it("compares resulting item stats", () => {
    expect(modifierResultStats(
      { id: 2888, damage: 23, useTime: 23, knockBack: 3 },
      { id: 2888, damage: 24, useTime: 21, knockBack: 2.7 },
    )).toEqual([
      { label: "Damage", base: "23", result: "24", beneficial: true },
      { label: "Use time", base: "23", result: "21", beneficial: true },
      { label: "Knockback", base: "3.0", result: "2.7", beneficial: false },
    ]);
  });
});
