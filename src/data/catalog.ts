import rawItems from "./items.json";
import rawPrefixes from "./prefixes.json";
import type { CatalogItem, ItemLocation, Prefix } from "../types";

export const items = rawItems as CatalogItem[];
export const prefixes = (rawPrefixes as Prefix[]).map((prefix, index) => ({
  ...prefix,
  id: prefix.id ?? index,
  name: prefix.name.trim() || "None",
}));

const byId = new Map(items.map((item) => [item.id, item]));

export function findItem(itemId: number): CatalogItem | undefined {
  return byId.get(itemId);
}

export function itemName(itemId: number): string {
  if (itemId === 0) return "Empty slot";
  return findItem(itemId)?.name ?? `Unknown item ${itemId}`;
}

export function itemInitials(itemId: number): string {
  if (itemId === 0) return "";
  return itemName(itemId)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function searchItems(query: string, limit = 8): CatalogItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const numeric = /^\d+$/.test(normalized) ? Number(normalized) : null;
  return items
    .filter((item) =>
      numeric !== null
        ? item.id === numeric
        : item.name.toLowerCase().includes(normalized) || item.key?.toLowerCase().includes(normalized),
    )
    .sort((left, right) => {
      if (numeric !== null) return left.id - right.id;
      const leftStarts = left.name.toLowerCase().startsWith(normalized);
      const rightStarts = right.name.toLowerCase().startsWith(normalized);
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function acceptsItem(location: ItemLocation, item: CatalogItem): boolean {
  if (location.area === "inventory" || location.area === "storage") return true;
  if (location.area === "loadoutDye" || location.area === "miscDye") {
    return /dye/i.test(item.name) || /dye$/i.test(item.key ?? "");
  }
  if (location.area === "miscEquip") {
    if (location.slot === 2) return /minecart/i.test(`${item.name} ${item.key ?? ""}`);
    if (location.slot === 3) return item.isMount === true;
    if (location.slot === 4) return /hook/i.test(`${item.name} ${item.key ?? ""}`);
    return true;
  }
  const slot = location.slot;
  if (slot === 0 || slot === 10) return item.head !== undefined;
  if (slot === 1 || slot === 11) return item.body !== undefined;
  if (slot === 2 || slot === 12) return item.legs !== undefined;
  return item.isAccessory === true;
}
