import { useEffect, useState } from "react";
import { itemInitials } from "../data/catalog";
import { useGameAssets } from "../lib/assets";

type Props = { itemId: number; large?: boolean; slot?: boolean };

const swatches = ["#7f9b90", "#a68c68", "#8295a8", "#9b817a", "#748c9a", "#9a9371"];

export function ItemGlyph({ itemId, large = false, slot = false }: Props) {
  if (itemId === 0) return null;
  return <AssetGlyph kind="item" id={itemId} fallback={itemInitials(itemId)} large={large} slot={slot} />;
}

export function BuffGlyph({ buffId }: { buffId: number }) {
  if (buffId === 0) return null;
  return <AssetGlyph kind="buff" id={buffId} fallback={String(buffId)} />;
}

function AssetGlyph({ kind, id, fallback, large = false, slot = false }: { kind: "item" | "buff"; id: number; fallback: string; large?: boolean; slot?: boolean }) {
  const { iconUrl } = useGameAssets();
  const url = iconUrl(kind, id);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const color = swatches[id % swatches.length];
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-md border p-1 font-mono font-semibold tracking-[-0.04em] ${
        large ? "size-16 text-base" : slot ? "size-10 text-[11px]" : "size-8 text-[11px]"
      } ${url && !failed ? "border-transparent bg-transparent" : ""
      }`}
      style={url && !failed ? undefined : { backgroundColor: `${color}26`, borderColor: `${color}78`, color }}
    >
      {url && !failed
        ? <img src={url} alt="" draggable={false} onError={() => setFailed(true)} className="block h-auto w-auto max-h-full max-w-full object-contain [image-rendering:pixelated]" />
        : fallback}
    </span>
  );
}
