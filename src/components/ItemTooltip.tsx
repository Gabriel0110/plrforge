import { Star } from "@phosphor-icons/react";
import { useId, useLayoutEffect, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { findItem, itemCategories, itemMatchesCategory, prefixes } from "../data/catalog";

type TriggerProps = {
  "aria-describedby"?: string;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
};

type Props = {
  itemId: number;
  stack?: number;
  prefix?: number;
  favorited?: boolean;
  context?: string;
  children: (props: TriggerProps) => ReactNode;
};

type Position = { left: number; top?: number; bottom?: number };

const rarityColors: Record<string, string> = {
  Gray: "text-white/38",
  Blue: "text-sky-300",
  Green: "text-emerald-300",
  Orange: "text-orange-300",
  LightRed: "text-rose-300",
  Pink: "text-pink-300",
  LightPurple: "text-violet-300",
  Lime: "text-lime-300",
  Yellow: "text-yellow-300",
  Cyan: "text-cyan-300",
  Red: "text-red-300",
  Quest: "text-amber-300",
  Master: "text-fuchsia-300",
  StrongRed: "text-red-200",
};

function positionFor(anchor: HTMLElement): Position {
  const rect = anchor.getBoundingClientRect();
  const width = 270;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
  if (window.innerHeight - rect.bottom >= 210) return { left, top: rect.bottom + 9 };
  return { left, bottom: window.innerHeight - rect.top + 9 };
}

export function ItemTooltip({ itemId, stack, prefix = 0, favorited = false, context, children }: Props) {
  const tooltipId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const item = findItem(itemId);

  useLayoutEffect(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }
    const update = () => setPosition(positionFor(anchor));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor]);

  const triggerProps: TriggerProps = itemId > 0 && item ? {
    "aria-describedby": anchor ? tooltipId : undefined,
    onMouseEnter: (event) => setAnchor(event.currentTarget),
    onMouseLeave: () => setAnchor(null),
    onFocus: (event) => setAnchor(event.currentTarget),
    onBlur: () => setAnchor(null),
  } : {};

  if (itemId <= 0 || !item) return <>{children(triggerProps)}</>;

  const rarity = item.rarity ?? "Common";
  const modifier = prefixes.find((entry) => entry.id === prefix)?.name ?? `Prefix ${prefix}`;
  const groups = itemCategories
    .filter(({ id }) => id !== "all" && id !== "other" && itemMatchesCategory(item, id))
    .slice(0, 3);

  return (
    <>
      {children(triggerProps)}
      {anchor && position && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[100] w-[270px] rounded-xl border border-white/14 bg-[#171c1a]/[0.98] p-3.5 text-left shadow-[0_20px_55px_-18px_rgba(0,0,0,.9)] backdrop-blur-md"
          style={position}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white/92">{modifier !== "None" ? `${modifier} ${item.name}` : item.name}</p>
              <p className={`mt-0.5 text-[10px] font-medium ${rarityColors[rarity] ?? "text-white/42"}`}>{rarity}</p>
            </div>
            {favorited && <Star weight="fill" className="mt-0.5 size-3.5 shrink-0 text-amber-300" />}
          </div>
          {context && <p className="mt-2 border-t border-white/[0.07] pt-2 text-[10px] text-emerald-200/55">{context}</p>}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-white/34">
            <span>Item ID</span><span className="text-right text-white/58">{item.id}</span>
            {stack !== undefined && <><span>Stack</span><span className="text-right text-white/58">{stack.toLocaleString()}</span></>}
            <span>Stack limit</span><span className="text-right text-white/58">{(item.maxStackSize ?? 9999).toLocaleString()}</span>
          </div>
          {groups.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1">{groups.map((group) => <span key={group.id} className="rounded-md border border-white/[0.07] bg-white/[0.035] px-1.5 py-1 text-[8px] font-medium text-white/38">{group.label}</span>)}</div>}
        </div>,
        document.body,
      )}
    </>
  );
}
