import type {
  ChangeEntry,
  EditorSnapshot,
  EquipmentDocument,
  InventoryItem,
  ItemLocation,
  PlayerDocument,
  StorageDocument,
} from "../types";

export type EditableDocument = Pick<PlayerDocument, "character" | "inventory" | "equipment" | "storage">;

export type EditorState = EditorSnapshot & {
  past: EditorSnapshot[];
  future: EditorSnapshot[];
};

export type EditorAction =
  | { type: "reset"; document: EditableDocument }
  | { type: "change"; document: EditableDocument; entry: ChangeEntry }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved" };

function snapshot(state: EditorSnapshot): EditorSnapshot {
  return {
    character: state.character,
    inventory: state.inventory,
    equipment: state.equipment,
    storage: state.storage,
    changes: state.changes,
  };
}

export function editableDocument(player: EditableDocument): EditableDocument {
  return {
    character: player.character,
    inventory: player.inventory,
    equipment: player.equipment,
    storage: player.storage,
  };
}

export function initialEditorState(document: EditableDocument): EditorState {
  return { ...editableDocument(document), changes: [], past: [], future: [] };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "reset") return initialEditorState(action.document);
  if (action.type === "saved") return { ...state, changes: [], past: [], future: [] };
  if (action.type === "change") {
    return {
      ...action.document,
      changes: [...state.changes, action.entry],
      past: [...state.past, snapshot(state)],
      future: [],
    };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      ...previous,
      past: state.past.slice(0, -1),
      future: [snapshot(state), ...state.future],
    };
  }
  const next = state.future[0];
  if (!next) return state;
  return {
    ...next,
    past: [...state.past, snapshot(state)],
    future: state.future.slice(1),
  };
}

export function replaceItem(items: InventoryItem[], slot: number, patch: Partial<InventoryItem>): InventoryItem[] {
  return items.map((item) => (item.slot === slot ? { ...item, ...patch, slot } : item));
}

export const emptyItem = (slot: number): InventoryItem => ({
  slot,
  itemId: 0,
  stack: 0,
  prefix: 0,
  favorited: false,
});

export function itemAt(document: EditableDocument, location: ItemLocation): InventoryItem {
  if (location.area === "inventory") return document.inventory[location.slot];
  if (location.area === "loadoutArmor") return document.equipment.loadouts[location.loadout].armor[location.slot];
  if (location.area === "loadoutDye") return document.equipment.loadouts[location.loadout].dyes[location.slot];
  if (location.area === "miscEquip") return document.equipment.miscEquips[location.slot];
  if (location.area === "miscDye") return document.equipment.miscDyes[location.slot];
  return document.storage[location.storage][location.slot];
}

export function replaceItemAt(
  document: EditableDocument,
  location: ItemLocation,
  patch: Partial<InventoryItem>,
): EditableDocument {
  if (location.area === "inventory") {
    return { ...document, inventory: replaceItem(document.inventory, location.slot, patch) };
  }
  if (location.area === "storage") {
    return {
      ...document,
      storage: {
        ...document.storage,
        [location.storage]: replaceItem(document.storage[location.storage], location.slot, patch),
      },
    };
  }
  const equipment: EquipmentDocument = { ...document.equipment };
  if (location.area === "miscEquip") {
    equipment.miscEquips = replaceItem(equipment.miscEquips, location.slot, patch);
  } else if (location.area === "miscDye") {
    equipment.miscDyes = replaceItem(equipment.miscDyes, location.slot, patch);
  } else {
    equipment.loadouts = equipment.loadouts.map((loadout, index) => {
      if (index !== location.loadout) return loadout;
      return location.area === "loadoutArmor"
        ? { ...loadout, armor: replaceItem(loadout.armor, location.slot, patch) }
        : { ...loadout, dyes: replaceItem(loadout.dyes, location.slot, patch) };
    });
  }
  return { ...document, equipment };
}

export function replaceVisibilityAt(
  document: EditableDocument,
  loadout: number,
  slot: number,
  hidden: boolean,
): EditableDocument {
  const loadouts = document.equipment.loadouts.map((entry, index) => {
    if (index !== loadout) return entry;
    return { ...entry, hidden: entry.hidden.map((value, flag) => (flag === slot ? hidden : value)) };
  });
  return { ...document, equipment: { ...document.equipment, loadouts } };
}

export function replaceMiscVisibilityAt(
  document: EditableDocument,
  slot: number,
  hidden: boolean,
): EditableDocument {
  return {
    ...document,
    equipment: {
      ...document.equipment,
      miscHidden: document.equipment.miscHidden.map((value, index) => (index === slot ? hidden : value)),
    },
  };
}

export function locationLabel(location: ItemLocation): string {
  if (location.area === "inventory") return `Inventory ${location.slot + 1}`;
  if (location.area === "storage") {
    const names: Record<keyof StorageDocument, string> = {
      piggyBank: "Piggy Bank",
      safe: "Safe",
      defendersForge: "Defender's Forge",
      voidVault: "Void Vault",
    };
    return `${names[location.storage]} ${location.slot + 1}`;
  }
  if (location.area === "miscEquip") return `Misc equipment ${location.slot + 1}`;
  if (location.area === "miscDye") return `Misc dye ${location.slot + 1}`;
  const kind = location.area === "loadoutArmor" ? "equipment" : "dye";
  return `Loadout ${location.loadout + 1} ${kind} ${location.slot + 1}`;
}
