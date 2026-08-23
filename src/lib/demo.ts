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
  name: "NewBruv",
  difficulty: 0,
  playTimeTicks: "2763000000000",
  coreStats: {
    life: 400,
    lifeMax: 500,
    mana: 180,
    manaMax: 200,
    hair: 17,
    hairDye: 0,
    team: 0,
    skinVariant: 0,
  },
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
