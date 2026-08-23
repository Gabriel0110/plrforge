import { itemInitials } from "../data/catalog";

type Props = { itemId: number; large?: boolean };

const swatches = ["#7f9b90", "#a68c68", "#8295a8", "#9b817a", "#748c9a", "#9a9371"];

export function ItemGlyph({ itemId, large = false }: Props) {
  if (itemId === 0) return null;
  const color = swatches[itemId % swatches.length];
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-md border font-mono font-semibold tracking-[-0.04em] ${
        large ? "size-16 text-base" : "size-8 text-[11px]"
      }`}
      style={{ backgroundColor: `${color}26`, borderColor: `${color}78`, color }}
    >
      {itemInitials(itemId)}
    </span>
  );
}
