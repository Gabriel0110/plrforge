import type { InventoryItem, PlayerDocument } from "../types";

const inventory = Array.from({ length: 58 }, (_, slot): InventoryItem => ({
  slot,
  itemId: 0,
  stack: 0,
  prefix: 0,
  favorited: false,
}));

const slots = (length: number) => Array.from({ length }, (_, slot): InventoryItem => ({
  slot,
  itemId: 0,
  stack: 0,
  prefix: 0,
  favorited: false,
}));

[
  [1, 1, 1],
  [8, 50, 99],
  [28, 30, 12],
  [71, 999, 50],
  [72, 999, 51],
  [73, 999, 52],
  [74, 999, 53],
  [97, 320, 54],
  [3043, 1, 18],
  [2768, 1, 19],
].forEach(([itemId, stack, slot]) => {
  inventory[slot] = { slot, itemId, stack, prefix: 0, favorited: false };
});

export const demoPlayer: PlayerDocument = {
  path: "/preview/NewBruv.plr",
  sourceHash: "preview",
  version: 325,
  character: {
    name: "NewBruv",
    difficulty: 0,
    playTimeTicks: "2763000000000",
    stats: { life: 400, lifeMax: 500, mana: 180, manaMax: 200 },
    appearance: {
      hair: 17,
      hairDye: 0,
      team: 0,
      skinVariant: 0,
      hairColor: { r: 90, g: 62, b: 42 },
      skinColor: { r: 255, g: 198, b: 160 },
      eyeColor: { r: 105, g: 105, b: 105 },
      shirtColor: { r: 46, g: 96, b: 168 },
      underShirtColor: { r: 224, g: 116, b: 76 },
      pantsColor: { r: 58, g: 60, b: 66 },
      shoeColor: { r: 92, g: 68, b: 52 },
      voiceVariant: 1,
      voicePitch: 0,
    },
    upgrades: {
      extraAccessory: true,
      unlockedBiomeTorches: true,
      usingBiomeTorches: true,
      ateArtisanBread: false,
      usedAegisCrystal: true,
      usedAegisFruit: true,
      usedArcaneCrystal: true,
      usedGalaxyPearl: true,
      usedGummyWorm: true,
      usedAmbrosia: true,
      downedDd2Event: true,
    },
    counters: { taxMoney: 125000, pveDeaths: 14, pvpDeaths: 2 },
  },
  effects: {
    buffs: Array.from({ length: 44 }, (_, slot) => ({ slot, buffId: 0, time: 0 })),
  },
  journey: {
    research: [
      { persistentId: "MagicLantern", count: 1 },
      { persistentId: "IronPickaxe", count: 1 },
    ],
    powers: { godmode: false, farPlacementRange: true, spawnRate: 0.5 },
    serializedPowerIds: [5, 11, 14],
    unlockedSuperCart: false,
    enabledSuperCart: true,
  },
  spawnPoints: [
    { x: 1240, y: 388, worldId: 11235813, worldName: "Verdant Reach" },
  ],
  inventory,
  equipment: {
    currentLoadoutIndex: 0,
    loadouts: Array.from({ length: 3 }, () => ({
      armor: slots(20),
      dyes: slots(10),
      hidden: Array.from({ length: 10 }, () => false),
    })),
    miscEquips: slots(5),
    miscDyes: slots(5),
    miscHidden: Array.from({ length: 5 }, () => false),
  },
  storage: {
    piggyBank: slots(40),
    safe: slots(40),
    defendersForge: slots(40),
    voidVault: slots(40),
  },
};
