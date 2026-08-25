import { Star } from "@phosphor-icons/react";
import { useEffect, useId, useLayoutEffect, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { findItem, itemCategories, itemMatchesCategory, prefixes } from "../data/catalog";
import { useGameAssets } from "../lib/assets";
import type { GameItemMetadata } from "../lib/native";

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
  const width = 310;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
  if (window.innerHeight - rect.bottom >= 320) return { left, top: rect.bottom + 9 };
  return { left, bottom: window.innerHeight - rect.top + 9 };
}

function damageClass(metadata: GameItemMetadata) {
  if (metadata.melee) return "melee";
  if (metadata.ranged) return "ranged";
  if (metadata.magic) return "magic";
  if (metadata.summon) return "summon";
  return "weapon";
}

function speedLabel(useAnimation: number) {
  if (useAnimation <= 8) return "Insanely fast";
  if (useAnimation <= 20) return "Very fast";
  if (useAnimation <= 25) return "Fast";
  if (useAnimation <= 30) return "Average";
  if (useAnimation <= 35) return "Slow";
  if (useAnimation <= 45) return "Very slow";
  if (useAnimation <= 55) return "Extremely slow";
  return "Snail";
}

function formatCoins(value: number) {
  const platinum = Math.floor(value / 1_000_000);
  const gold = Math.floor(value % 1_000_000 / 10_000);
  const silver = Math.floor(value % 10_000 / 100);
  const copper = value % 100;
  return [
    platinum ? `${platinum} platinum` : "",
    gold ? `${gold} gold` : "",
    silver ? `${silver} silver` : "",
    copper ? `${copper} copper` : "",
  ].filter(Boolean).join(" ") || "No value";
}

function nativeStatLines(metadata: GameItemMetadata) {
  const lines: string[] = [];
  if ((metadata.damage ?? 0) > 0) {
    lines.push(`${metadata.damage} ${damageClass(metadata)} damage`);
    if (!metadata.summon) lines.push(`${(metadata.crit ?? 0) + 4}% critical strike chance`);
  }
  if ((metadata.useAnimation ?? 0) > 0 && ((metadata.damage ?? 0) > 0 || (metadata.healLife ?? 0) > 0 || (metadata.healMana ?? 0) > 0)) {
    lines.push(`${speedLabel(metadata.useAnimation!)} speed · ${metadata.useAnimation} ticks`);
  }
  if ((metadata.knockBack ?? 0) > 0) lines.push(`${metadata.knockBack} knockback`);
  if ((metadata.mana ?? 0) > 0) lines.push(`Uses ${metadata.mana} mana`);
  if ((metadata.defense ?? 0) > 0) lines.push(`${metadata.defense} defense`);
  if ((metadata.pick ?? 0) > 0) lines.push(`${metadata.pick}% pickaxe power`);
  if ((metadata.axe ?? 0) > 0) lines.push(`${metadata.axe! * 5}% axe power`);
  if ((metadata.hammer ?? 0) > 0) lines.push(`${metadata.hammer}% hammer power`);
  if ((metadata.healLife ?? 0) > 0) lines.push(`Restores ${metadata.healLife} life`);
  if ((metadata.healMana ?? 0) > 0) lines.push(`Restores ${metadata.healMana} mana`);
  if ((metadata.fishingPole ?? 0) > 0) lines.push(`${metadata.fishingPole}% fishing power`);
  if ((metadata.bait ?? 0) > 0) lines.push(`${metadata.bait}% bait power`);
  if ((metadata.tileBoost ?? 0) > 0) lines.push(`+${metadata.tileBoost} placement range`);
  if (metadata.autoReuse) lines.push("Auto-reuse");
  if (metadata.channel) lines.push("Channelled");
  if ((metadata.value ?? 0) > 0) lines.push(`Value: ${formatCoins(metadata.value!)}`);
  return lines;
}

export function ItemTooltip({ itemId, stack, prefix = 0, favorited = false, context, children }: Props) {
  const tooltipId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const item = findItem(itemId);
  const { itemMetadata, itemVariant, metadataVersion, prefetchItemMetadata } = useGameAssets();
  const metadata = itemMetadata(itemId, prefix);
  const variant = prefix > 0 ? itemVariant(itemId, prefix) : null;

  useEffect(() => {
    if (anchor && prefix > 0 && variant?.state === "unresolved") {
      void prefetchItemMetadata([{ id: itemId, prefix }]);
    }
  }, [anchor, itemId, prefetchItemMetadata, prefix, variant?.state]);

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
  const modifier = (prefixes.find((entry) => entry.id === prefix)?.name ?? `Prefix ${prefix}`).trim();
  const displayName = metadata?.name ?? item.name;
  const stats = metadata ? nativeStatLines(metadata) : [];
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
          className="pointer-events-none fixed z-[100] max-h-[min(430px,calc(100vh-24px))] w-[310px] overflow-hidden rounded-xl border border-white/14 bg-[#171c1a]/[0.985] p-4 text-left shadow-[0_22px_60px_-18px_rgba(0,0,0,.94)] backdrop-blur-md"
          style={position}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`truncate text-[14px] font-semibold ${rarityColors[rarity] ?? "text-white/92"}`}>{modifier && modifier !== "None" ? `${modifier} ${displayName}` : displayName}</p>
              <p className={`mt-0.5 text-[10px] font-medium ${rarityColors[rarity] ?? "text-white/42"}`}>{rarity}</p>
            </div>
            {favorited && <Star weight="fill" className="mt-0.5 size-3.5 shrink-0 text-amber-300" />}
          </div>
          {stats.length > 0 && <div className="mt-3 space-y-1 text-[11px] leading-4 text-white/72">{stats.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>}
          {metadata?.tooltip && <div className="mt-3 border-t border-white/[0.07] pt-2.5 text-[11px] leading-[1.45] text-sky-100/66">{metadata.tooltip.split("\n").map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>}
          {prefix > 0 && variant && (variant.state === "loading" || variant.state === "unresolved") && <p className="mt-2 text-[9px] leading-4 text-amber-200/45">Loading Terraria's exact {modifier} modifier values…</p>}
          {prefix > 0 && variant?.state === "incompatible" && <p className="mt-2 text-[9px] leading-4 text-amber-200/45">{modifier} is stored on this item, but Terraria does not normally allow it to roll here. Base stats are shown.</p>}
          {context && <p className="mt-3 border-t border-white/[0.07] pt-2 text-[9px] uppercase tracking-[0.1em] text-emerald-200/44">{context}</p>}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-white/30">
            <span>Item ID</span><span className="text-right text-white/58">{item.id}</span>
            {stack !== undefined && <><span>Stack</span><span className="text-right text-white/58">{stack.toLocaleString()}</span></>}
            <span>Stack limit</span><span className="text-right text-white/58">{(item.maxStackSize ?? 9999).toLocaleString()}</span>
          </div>
          {groups.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1">{groups.map((group) => <span key={group.id} className="rounded-md border border-white/[0.07] bg-white/[0.035] px-1.5 py-1 text-[8px] font-medium text-white/38">{group.label}</span>)}</div>}
          {metadataVersion && <p className="mt-2 font-mono text-[8px] text-white/20">Local Terraria {metadataVersion} data</p>}
        </div>,
        document.body,
      )}
    </>
  );
}
