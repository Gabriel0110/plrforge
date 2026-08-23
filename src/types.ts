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

export type CoreStats = {
  life: number;
  lifeMax: number;
  mana: number;
  manaMax: number;
  hair: number;
  hairDye: number;
  team: number;
  skinVariant: number;
};

export type PlayerDocument = {
  path: string;
  sourceHash: string;
  version: number;
  name: string;
  difficulty: number;
  playTimeTicks: string;
  coreStats: CoreStats;
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
