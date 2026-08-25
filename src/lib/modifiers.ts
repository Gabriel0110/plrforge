import type { GameItemMetadata } from "./native";

export type ModifierFamily = "universal" | "melee" | "ranged" | "magic" | "summon" | "yoyo" | "accessory";
export type ModifierQuality = "positive" | "mixed" | "negative" | "neutral";
export type ModifierEffectKey = "damage" | "critical" | "speed" | "size" | "knockback" | "velocity" | "mana" | "tagDamage" | "armorPenetration" | "defense" | "movement";

export type ModifierEffect = {
  key: ModifierEffectKey;
  label: string;
  beneficial: boolean;
};

const accessoryEffects: Record<number, ModifierEffect> = {
  62: { key: "defense", label: "+1 defense", beneficial: true },
  63: { key: "defense", label: "+2 defense", beneficial: true },
  64: { key: "defense", label: "+3 defense", beneficial: true },
  65: { key: "defense", label: "+4 defense", beneficial: true },
  66: { key: "mana", label: "+20 maximum mana", beneficial: true },
  67: { key: "critical", label: "+2% critical strike chance", beneficial: true },
  68: { key: "critical", label: "+4% critical strike chance", beneficial: true },
  69: { key: "damage", label: "+1% damage", beneficial: true },
  70: { key: "damage", label: "+2% damage", beneficial: true },
  71: { key: "damage", label: "+3% damage", beneficial: true },
  72: { key: "damage", label: "+4% damage", beneficial: true },
  73: { key: "movement", label: "+1% movement speed", beneficial: true },
  74: { key: "movement", label: "+2% movement speed", beneficial: true },
  75: { key: "movement", label: "+3% movement speed", beneficial: true },
  76: { key: "movement", label: "+4% movement speed", beneficial: true },
  77: { key: "speed", label: "+1% melee speed", beneficial: true },
  78: { key: "speed", label: "+2% melee speed", beneficial: true },
  79: { key: "speed", label: "+3% melee speed", beneficial: true },
  80: { key: "speed", label: "+4% melee speed", beneficial: true },
};

const closeToOne = (value?: number) => value === undefined || Math.abs(value - 1) < 0.0005;
const percent = (value: number) => Math.round(Math.abs(value - 1) * 100);

export function modifierFamily(prefix: number): ModifierFamily {
  if (prefix >= 1 && prefix <= 15 || prefix === 81) return "melee";
  if (prefix >= 16 && prefix <= 25 || prefix === 82) return "ranged";
  if (prefix >= 26 && prefix <= 35 || prefix === 83) return "magic";
  if (prefix >= 36 && prefix <= 61) return "universal";
  if (prefix >= 62 && prefix <= 80) return "accessory";
  if (prefix === 84) return "yoyo";
  return "summon";
}

export const modifierFamilyLabels: Record<ModifierFamily, string> = {
  universal: "Universal weapon",
  melee: "Melee",
  ranged: "Ranged",
  magic: "Magic",
  summon: "Summon",
  yoyo: "Yoyo",
  accessory: "Accessory",
};

export const modifierEffectLabels: Record<ModifierEffectKey, string> = {
  damage: "Damage",
  critical: "Critical chance",
  speed: "Speed",
  size: "Size",
  knockback: "Knockback",
  velocity: "Projectile velocity",
  mana: "Mana",
  tagDamage: "Tag damage",
  armorPenetration: "Armor penetration",
  defense: "Defense",
  movement: "Movement",
};

export function modifierEffects(prefix: number, metadata: GameItemMetadata | null): ModifierEffect[] {
  const accessory = accessoryEffects[prefix];
  if (accessory) return [accessory];
  if (!metadata) return [];

  const effects: ModifierEffect[] = [];
  const addMultiplier = (
    key: ModifierEffectKey,
    value: number | undefined,
    betterWhenHigher: boolean,
    higherLabel: string,
    lowerLabel: string,
  ) => {
    if (closeToOne(value)) return;
    const higher = value! > 1;
    effects.push({
      key,
      label: `${percent(value!)}% ${higher ? higherLabel : lowerLabel}`,
      beneficial: higher === betterWhenHigher,
    });
  };

  addMultiplier("damage", metadata.prefixDamageMultiplier, true, "more damage", "less damage");
  if ((metadata.prefixCritBonus ?? 0) !== 0) {
    const amount = metadata.prefixCritBonus!;
    effects.push({ key: "critical", label: `${amount > 0 ? "+" : ""}${amount}% critical strike chance`, beneficial: amount > 0 });
  }
  addMultiplier("speed", metadata.prefixSpeedMultiplier, false, "slower use speed", "faster use speed");
  addMultiplier("size", metadata.prefixScaleMultiplier, true, "larger size", "smaller size");
  addMultiplier("knockback", metadata.prefixKnockbackMultiplier, true, "more knockback", "less knockback");
  addMultiplier("velocity", metadata.prefixVelocityMultiplier, true, "more projectile velocity", "less projectile velocity");
  addMultiplier("mana", metadata.prefixManaMultiplier, false, "more mana used", "less mana used");
  if ((metadata.prefixTagDamageBonus ?? 0) !== 0) {
    const amount = metadata.prefixTagDamageBonus!;
    effects.push({ key: "tagDamage", label: `${amount > 0 ? "+" : ""}${amount} summon tag damage`, beneficial: amount > 0 });
  }
  if ((metadata.prefixArmorPenetrationBonus ?? 0) !== 0) {
    const amount = metadata.prefixArmorPenetrationBonus!;
    effects.push({ key: "armorPenetration", label: `${amount > 0 ? "+" : ""}${amount} armor penetration`, beneficial: amount > 0 });
  }
  return effects;
}

export function modifierQuality(effects: ModifierEffect[]): ModifierQuality {
  if (!effects.length) return "neutral";
  const positive = effects.some((effect) => effect.beneficial);
  const negative = effects.some((effect) => !effect.beneficial);
  if (positive && negative) return "mixed";
  return positive ? "positive" : "negative";
}

export function modifierResultStats(base: GameItemMetadata | null, variant: GameItemMetadata | null) {
  if (!base || !variant) return [] as Array<{ label: string; base: string; result: string; beneficial: boolean | null }>;
  const rows: Array<{ label: string; base: string; result: string; beneficial: boolean | null }> = [];
  const integer = (label: string, baseValue: number | undefined, resultValue: number | undefined, lowerIsBetter = false) => {
    if (baseValue === undefined || resultValue === undefined || baseValue === resultValue) return;
    rows.push({ label, base: String(baseValue), result: String(resultValue), beneficial: lowerIsBetter ? resultValue < baseValue : resultValue > baseValue });
  };
  const decimal = (label: string, baseValue: number | undefined, resultValue: number | undefined, lowerIsBetter = false) => {
    if (baseValue === undefined || resultValue === undefined || Math.abs(baseValue - resultValue) < 0.0005) return;
    rows.push({ label, base: baseValue.toFixed(1), result: resultValue.toFixed(1), beneficial: lowerIsBetter ? resultValue < baseValue : resultValue > baseValue });
  };
  integer("Damage", base.damage, variant.damage);
  integer("Critical bonus", base.crit ?? 0, variant.crit ?? 0);
  integer("Use time", base.useTime, variant.useTime, true);
  integer("Animation", base.useAnimation, variant.useAnimation, true);
  integer("Mana cost", base.mana, variant.mana, true);
  decimal("Knockback", base.knockBack, variant.knockBack);
  decimal("Scale", base.scale, variant.scale);
  decimal("Velocity", base.shootSpeed, variant.shootSpeed);
  return rows;
}
