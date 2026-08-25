import type { KeyboardEvent, ReactNode } from "react";

const gridItemSelector = "[data-keyboard-grid-item]";
const rovingItemSelector = "[data-roving-item]";

function enabledItems(container: HTMLElement, selector: string) {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((item) => {
    if (item instanceof HTMLButtonElement || item instanceof HTMLInputElement) return !item.disabled;
    return item.getAttribute("aria-disabled") !== "true";
  });
}

function markTabStop(items: HTMLElement[], next: HTMLElement) {
  for (const item of items) item.tabIndex = item === next ? 0 : -1;
}

function retainTabStop(items: HTMLElement[], next: HTMLElement) {
  markTabStop(items, next);
  next.focus();
}

function gridColumnCount(container: HTMLElement, fallback: number) {
  const rendered = window.getComputedStyle(container).gridTemplateColumns;
  if (!rendered || rendered === "none") return fallback;
  return Math.max(1, rendered.split(" ").filter(Boolean).length);
}

function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>, configuredColumns?: number) {
  const target = (event.target as HTMLElement).closest<HTMLElement>(gridItemSelector);
  if (!target) return;
  const items = enabledItems(event.currentTarget, gridItemSelector);
  const index = items.indexOf(target);
  if (index < 0) return;

  const columns = configuredColumns ?? gridColumnCount(event.currentTarget, 1);
  let nextIndex = index;
  if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
  else if (event.key === "ArrowRight") nextIndex = Math.min(items.length - 1, index + 1);
  else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - columns);
  else if (event.key === "ArrowDown") nextIndex = Math.min(items.length - 1, index + columns);
  else if (event.key === "Home") nextIndex = event.ctrlKey ? 0 : index - (index % columns);
  else if (event.key === "End") nextIndex = event.ctrlKey
    ? items.length - 1
    : Math.min(items.length - 1, index + (columns - 1 - (index % columns)));
  else return;

  event.preventDefault();
  retainTabStop(items, items[nextIndex]);
}

type KeyboardGridProps = {
  label: string;
  columns?: number;
  className?: string;
  children: ReactNode;
};

export function KeyboardGrid({ label, columns, className, children }: KeyboardGridProps) {
  return (
    <div
      role="group"
      aria-label={`${label}. Use arrow keys to move between slots; press Enter or Space to select.`}
      className={className}
      onKeyDown={(event) => handleGridKeyDown(event, columns)}
      onFocusCapture={(event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>(gridItemSelector);
        if (target) markTabStop(enabledItems(event.currentTarget, gridItemSelector), target);
      }}
    >
      {children}
    </div>
  );
}

type RovingGroupProps = {
  label: string;
  role?: "group" | "radiogroup" | "tablist";
  orientation?: "horizontal" | "vertical";
  activateOnMove?: boolean;
  className?: string;
  children: ReactNode;
};

export function RovingGroup({
  label,
  role = "group",
  orientation = "horizontal",
  activateOnMove = false,
  className,
  children,
}: RovingGroupProps) {
  return (
    <div
      role={role}
      aria-label={label}
      aria-orientation={role === "tablist" || role === "radiogroup" ? orientation : undefined}
      className={className}
      onKeyDown={(event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>(rovingItemSelector);
        if (!target) return;
        const items = enabledItems(event.currentTarget, rovingItemSelector);
        const index = items.indexOf(target);
        if (index < 0) return;
        const previousKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
        const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
        let nextIndex = index;
        if (event.key === previousKey) nextIndex = (index - 1 + items.length) % items.length;
        else if (event.key === nextKey) nextIndex = (index + 1) % items.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = items.length - 1;
        else return;
        event.preventDefault();
        const next = items[nextIndex];
        retainTabStop(items, next);
        if (activateOnMove) next.click();
      }}
      onFocusCapture={(event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>(rovingItemSelector);
        if (target) markTabStop(enabledItems(event.currentTarget, rovingItemSelector), target);
      }}
    >
      {children}
    </div>
  );
}
