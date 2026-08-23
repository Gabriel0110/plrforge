export type InventoryItem = {
  slot: number;
  itemId: number;
  stack: number;
  prefix: number;
  favorited: boolean;
};

export type EquipmentLoadout = {
  armor: InventoryItem[];
  dyes: InventoryItem[];
  hidden: boolean[];
};

export type EquipmentDocument = {
  currentLoadoutIndex: number;
  loadouts: EquipmentLoadout[];
  miscEquips: InventoryItem[];
  miscDyes: InventoryItem[];
  miscHidden: boolean[];
};

export type StorageDocument = {
  piggyBank: InventoryItem[];
  safe: InventoryItem[];
  defendersForge: InventoryItem[];
  voidVault: InventoryItem[];
};

export type CharacterStats = {
  life: number;
  lifeMax: number;
  mana: number;
  manaMax: number;
};

export type RgbColor = { r: number; g: number; b: number };

export type CharacterAppearance = {
  hair: number;
  hairDye: number;
  team: number;
  skinVariant: number;
  hairColor: RgbColor;
  skinColor: RgbColor;
  eyeColor: RgbColor;
  shirtColor: RgbColor;
  underShirtColor: RgbColor;
  pantsColor: RgbColor;
  shoeColor: RgbColor;
  voiceVariant: number;
  voicePitch: number;
};

export type PermanentUpgrades = {
  extraAccessory: boolean;
  unlockedBiomeTorches: boolean;
  usingBiomeTorches: boolean;
  ateArtisanBread: boolean;
  usedAegisCrystal: boolean;
  usedAegisFruit: boolean;
  usedArcaneCrystal: boolean;
  usedGalaxyPearl: boolean;
  usedGummyWorm: boolean;
  usedAmbrosia: boolean;
  downedDd2Event: boolean;
};

export type CharacterCounters = {
  taxMoney: number;
  pveDeaths: number;
  pvpDeaths: number;
};

export type CharacterDocument = {
  name: string;
  difficulty: number;
  playTimeTicks: string;
  stats: CharacterStats;
  appearance: CharacterAppearance;
  upgrades: PermanentUpgrades;
  counters: CharacterCounters;
};

export type PlayerDocument = {
  path: string;
  sourceHash: string;
  version: number;
  character: CharacterDocument;
  inventory: InventoryItem[];
  equipment: EquipmentDocument;
  storage: StorageDocument;
};

export type DiscoveredPlayer = {
  path: string;
  name: string;
  version: number;
  modifiedAt: number;
};

export type SaveReceipt = {
  backupPath: string;
  sourceHash: string;
  savedAt: string;
};

export type CatalogItem = {
  id: number;
  name: string;
  key?: string;
  maxStackSize?: number;
  rarity?: string;
  isAccessory?: boolean;
  isMount?: boolean;
  head?: number;
  body?: number;
  legs?: number;
};

export type Prefix = {
  id?: number;
  name: string;
  key?: string;
};

export type ChangeEntry = {
  id: string;
  description: string;
  location: string;
};

export type EditorSnapshot = {
  character: CharacterDocument;
  inventory: InventoryItem[];
  equipment: EquipmentDocument;
  storage: StorageDocument;
  changes: ChangeEntry[];
};

export type StorageKey = keyof StorageDocument;

export type ItemLocation =
  | { area: "inventory"; slot: number }
  | { area: "loadoutArmor"; loadout: number; slot: number }
  | { area: "loadoutDye"; loadout: number; slot: number }
  | { area: "miscEquip"; slot: number }
  | { area: "miscDye"; slot: number }
  | { area: "storage"; storage: StorageKey; slot: number };
