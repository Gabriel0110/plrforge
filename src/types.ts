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

export type BuffSlot = {
  slot: number;
  buffId: number;
  time: number;
};

export type EffectsDocument = { buffs: BuffSlot[] };

export type SpawnPoint = {
  x: number;
  y: number;
  worldId: number;
  worldName: string;
};

export type ResearchEntry = {
  persistentId: string;
  count: number;
};

export type JourneyDocument = {
  research: ResearchEntry[];
  powers: {
    godmode: boolean;
    farPlacementRange: boolean;
    spawnRate: number;
  };
  serializedPowerIds: number[];
  unlockedSuperCart: boolean;
  enabledSuperCart: boolean;
};

export type PlayerDocument = {
  path: string;
  sourceHash: string;
  version: number;
  character: CharacterDocument;
  effects: EffectsDocument;
  journey: JourneyDocument;
  spawnPoints: SpawnPoint[];
  inventory: InventoryItem[];
  equipment: EquipmentDocument;
  storage: StorageDocument;
};

export type PlayerCompatibility = {
  state: "supported" | "untested" | "unsupported";
  fileVersion: number;
  formatLabel: string;
  canEdit: boolean;
  message: string;
};

export type DiscoveredPlayer = {
  path: string;
  name: string;
  version: number;
  modifiedAt: number;
  compatibility: PlayerCompatibility;
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
  scale?: number;
  maxStackSize?: number;
  rarity?: string;
  isRackable?: boolean;
  isAccessory?: boolean;
  isMount?: boolean;
  isCritter?: boolean;
  isFood?: boolean;
  createTile?: number;
  createWall?: number;
  head?: number;
  body?: number;
  legs?: number;
};

export type ItemCategory =
  | "all"
  | "rackable"
  | "armor"
  | "accessories"
  | "placeables"
  | "mounts"
  | "critters"
  | "food"
  | "dyes"
  | "other";

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
  effects: EffectsDocument;
  journey: JourneyDocument;
  spawnPoints: SpawnPoint[];
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
