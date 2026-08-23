import {
  ChartBar,
  Heart,
  IdentificationBadge,
  Palette,
  ShieldWarning,
  Sparkle,
} from "@phosphor-icons/react";
import type {
  CharacterAppearance,
  CharacterDocument,
  PermanentUpgrades,
  RgbColor,
} from "../types";

type Props = {
  character: CharacterDocument;
  version: number;
  onChange: (character: CharacterDocument, description: string, location: string) => void;
};

const difficulties = ["Classic", "Mediumcore", "Hardcore", "Journey"];
const teams = ["None", "Red", "Green", "Blue", "Yellow", "Pink"];
const styles = [
  "Male starter",
  "Male sticker",
  "Male gangster",
  "Male coat",
  "Female starter",
  "Female sticker",
  "Female gangster",
  "Female coat",
  "Male dress",
  "Female dress",
  "Male display doll",
  "Female display doll",
];

const fieldClass = "mt-2 h-10 w-full rounded-lg border border-white/[0.09] bg-black/20 px-3 text-[13px] text-white/82 transition hover:border-white/15 focus:border-emerald-300/40";
const cardClass = "rounded-xl border border-white/[0.08] bg-white/[0.018] p-5";

type ColorKey =
  | "hairColor"
  | "skinColor"
  | "eyeColor"
  | "shirtColor"
  | "underShirtColor"
  | "pantsColor"
  | "shoeColor";

const colors: { key: ColorKey; label: string }[] = [
  { key: "hairColor", label: "Hair" },
  { key: "skinColor", label: "Skin" },
  { key: "eyeColor", label: "Eyes" },
  { key: "shirtColor", label: "Shirt" },
  { key: "underShirtColor", label: "Undershirt" },
  { key: "pantsColor", label: "Pants" },
  { key: "shoeColor", label: "Shoes" },
];

const upgrades: { key: keyof PermanentUpgrades; label: string; detail: string }[] = [
  { key: "extraAccessory", label: "Demon Heart", detail: "Extra accessory slot in Expert and Master worlds" },
  { key: "unlockedBiomeTorches", label: "Torch God's Favor", detail: "Unlocks biome torch conversion" },
  { key: "usingBiomeTorches", label: "Biome torch swap enabled", detail: "Current state of the Torch God's Favor toggle" },
  { key: "ateArtisanBread", label: "Artisan Loaf", detail: "Extends crafting-station reach" },
  { key: "usedAegisCrystal", label: "Aegis Crystal", detail: "Permanent defense increase" },
  { key: "usedAegisFruit", label: "Aegis Fruit", detail: "Permanent life-regeneration increase" },
  { key: "usedArcaneCrystal", label: "Arcane Crystal", detail: "Permanent mana-regeneration increase" },
  { key: "usedGalaxyPearl", label: "Galaxy Pearl", detail: "Permanent luck increase" },
  { key: "usedGummyWorm", label: "Gummy Worm", detail: "Permanent fishing-power increase" },
  { key: "usedAmbrosia", label: "Ambrosia", detail: "Permanent mining and placement-speed increase" },
  { key: "downedDd2Event", label: "Old One's Army defeated", detail: "Character-level event completion flag" },
];

function SectionTitle({ icon: Icon, eyebrow, title, detail }: { icon: typeof Heart; eyebrow: string; title: string; detail: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-emerald-300/10 bg-emerald-300/[0.045] text-emerald-300/75"><Icon className="size-[18px]" /></div>
      <div><p className="font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-emerald-300/58">{eyebrow}</p><h2 className="mt-1 text-[16px] font-semibold tracking-[-0.025em] text-white/88">{title}</h2><p className="mt-1 text-[11px] leading-5 text-white/34">{detail}</p></div>
    </div>
  );
}

function clamp(value: string, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function limitName(value: string) {
  let units = 0;
  let result = "";
  for (const symbol of value) {
    if (units + symbol.length > 20) break;
    result += symbol;
    units += symbol.length;
  }
  return result;
}

function toHex(color: RgbColor) {
  return `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(value: string): RgbColor {
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

function durationLabel(ticks: string) {
  try {
    const seconds = BigInt(ticks) / 10_000_000n;
    const hours = seconds / 3600n;
    const minutes = (seconds % 3600n) / 60n;
    return `${hours.toLocaleString()}h ${minutes.toString().padStart(2, "0")}m`;
  } catch {
    return "Invalid tick count";
  }
}

function coinLabel(copper: number) {
  const platinum = Math.floor(copper / 1_000_000);
  const gold = Math.floor((copper % 1_000_000) / 10_000);
  const silver = Math.floor((copper % 10_000) / 100);
  const remainder = copper % 100;
  return `${platinum}p ${gold}g ${silver}s ${remainder}c`;
}

export function CharacterPanel({ character, version, onChange }: Props) {
  const update = (next: Partial<CharacterDocument>, description: string, location: string) => {
    onChange({ ...character, ...next }, description, location);
  };
  const updateStats = (next: Partial<CharacterDocument["stats"]>, description: string) => {
    update({ stats: { ...character.stats, ...next } }, description, "Character · Stats");
  };
  const updateAppearance = (next: Partial<CharacterAppearance>, description: string, location = "Character · Appearance") => {
    update({ appearance: { ...character.appearance, ...next } }, description, location);
  };

  return (
    <main className="min-h-0 overflow-y-auto px-7 py-6">
      <div className="mx-auto max-w-[1040px]">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div><p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-300/65">Character editor</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white/92">Identity, stats, and progression</h1><p className="mt-2 max-w-[68ch] text-sm leading-6 text-white/38">Every editable value below maps to the verified player v{version} codec and participates in the same undo, backup, and save verification flow as item edits.</p></div>
          <div className="shrink-0 rounded-lg border border-white/[0.08] bg-black/15 px-3 py-2 text-right"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/28">Play time</p><p className="mt-1 font-mono text-xs text-white/65">{durationLabel(character.playTimeTicks)}</p></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <section className={cardClass}>
            <SectionTitle icon={IdentificationBadge} eyebrow="Identity" title="Player profile" detail="Name length follows Terraria's 20 UTF-16-unit limit." />
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-[11px] text-white/42">Name<input aria-label="Character name" className={fieldClass} value={character.name} onChange={(event) => update({ name: limitName(event.target.value) }, "Character name changed", "Character · Identity")} /></label>
              <label className="text-[11px] text-white/42">Difficulty<select aria-label="Character difficulty" className={fieldClass} value={character.difficulty} onChange={(event) => update({ difficulty: Number(event.target.value) }, `Difficulty changed to ${difficulties[Number(event.target.value)]}`, "Character · Identity")}>{difficulties.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
              {version >= 283 ? <label className="text-[11px] text-white/42">Team<select aria-label="Character team" className={fieldClass} value={character.appearance.team} onChange={(event) => updateAppearance({ team: Number(event.target.value) }, `Team changed to ${teams[Number(event.target.value)]}`, "Character · Identity")}>{teams.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label> : <div className="text-[11px] text-white/42">Team<div className={`${fieldClass} flex items-center text-white/32`}>Not stored by player v{version}</div></div>}
              <label className="col-span-2 text-[11px] text-white/42">Play time ticks<input aria-label="Play time ticks" inputMode="numeric" className={`${fieldClass} font-mono`} value={character.playTimeTicks} onChange={(event) => { if (/^\d+$/.test(event.target.value)) update({ playTimeTicks: event.target.value }, "Play time changed", "Character · Identity"); }} /></label>
            </div>
            {character.difficulty !== 0 && <div className="mt-4 flex gap-2 rounded-lg border border-amber-300/12 bg-amber-300/[0.035] p-3 text-[10px] leading-4 text-amber-100/54"><ShieldWarning className="mt-px size-4 shrink-0 text-amber-300/65" /><span>Difficulty changes affect death behavior and Journey-only systems. The editor writes the official mode byte but does not invent missing Journey research data.</span></div>}
          </section>

          <section className={cardClass}>
            <SectionTitle icon={Heart} eyebrow="Vitals" title="Health and mana" detail="Maximum values match the limits enforced by Terraria's player loader." />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] text-white/42">Current health<input aria-label="Current health" type="number" min={-1000} max={1000} className={`${fieldClass} font-mono`} value={character.stats.life} onChange={(event) => updateStats({ life: clamp(event.target.value, -1000, 1000) }, "Current health changed")} /></label>
              <label className="text-[11px] text-white/42">Maximum health<input aria-label="Maximum health" type="number" min={0} max={500} className={`${fieldClass} font-mono`} value={character.stats.lifeMax} onChange={(event) => updateStats({ lifeMax: clamp(event.target.value, 0, 500) }, "Maximum health changed")} /></label>
              <label className="text-[11px] text-white/42">Current mana<input aria-label="Current mana" type="number" min={-1000} max={400} className={`${fieldClass} font-mono`} value={character.stats.mana} onChange={(event) => updateStats({ mana: clamp(event.target.value, -1000, 400) }, "Current mana changed")} /></label>
              <label className="text-[11px] text-white/42">Maximum mana<input aria-label="Maximum mana" type="number" min={0} max={200} className={`${fieldClass} font-mono`} value={character.stats.manaMax} onChange={(event) => updateStats({ manaMax: clamp(event.target.value, 0, 200) }, "Maximum mana changed")} /></label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-rose-400/[0.055] p-3"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-rose-200/42">Health</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-rose-400/65" style={{ width: `${Math.max(0, Math.min(100, character.stats.lifeMax ? character.stats.life / character.stats.lifeMax * 100 : 0))}%` }} /></div></div><div className="rounded-lg bg-sky-400/[0.055] p-3"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-sky-200/42">Mana</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-sky-400/65" style={{ width: `${Math.max(0, Math.min(100, character.stats.manaMax ? character.stats.mana / character.stats.manaMax * 100 : 0))}%` }} /></div></div></div>
          </section>

          <section className={`${cardClass} col-span-2`}>
            <SectionTitle icon={Palette} eyebrow="Appearance" title="Style and colors" detail={`Styles 0–11 and hair 0–227 are verified for player v${version}.`} />
            <div className="grid grid-cols-4 gap-3">
              <label className="text-[11px] text-white/42">Character style<select aria-label="Character style" className={fieldClass} value={character.appearance.skinVariant} onChange={(event) => { const skinVariant = Number(event.target.value); updateAppearance({ skinVariant, ...(version < 280 ? { voiceVariant: skinVariant < 4 ? 1 : 2, voicePitch: 0 } : {}) }, "Character style changed"); }}>{styles.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
              <label className="text-[11px] text-white/42">Hair style<input aria-label="Hair style" type="number" min={0} max={227} className={`${fieldClass} font-mono`} value={character.appearance.hair} onChange={(event) => updateAppearance({ hair: clamp(event.target.value, 0, 227) }, "Hair style changed")} /></label>
              <label className="text-[11px] text-white/42">Hair dye ID<input aria-label="Hair dye ID" type="number" min={0} max={255} className={`${fieldClass} font-mono`} value={character.appearance.hairDye} onChange={(event) => updateAppearance({ hairDye: clamp(event.target.value, 0, 255) }, "Hair dye changed")} /></label>
              {version >= 280 ? <label className="text-[11px] text-white/42">Voice<select aria-label="Voice variant" className={fieldClass} value={character.appearance.voiceVariant} onChange={(event) => updateAppearance({ voiceVariant: Number(event.target.value) }, "Voice changed")}>{[1, 2, 3, 4].map((voice) => <option key={voice} value={voice}>Voice {voice}</option>)}</select></label> : <div className="text-[11px] text-white/42">Voice<div className={`${fieldClass} flex items-center text-white/32`}>Derived from character style</div></div>}
            </div>
            {version >= 281 ? <div className="mt-4 grid grid-cols-[1fr_160px] items-end gap-5"><label className="text-[11px] text-white/42">Voice pitch <span className="ml-1 font-mono text-white/62">{character.appearance.voicePitch.toFixed(2)}</span><input aria-label="Voice pitch" type="range" min={-1} max={1} step={0.05} className="mt-3 w-full accent-emerald-400" value={character.appearance.voicePitch} onChange={(event) => updateAppearance({ voicePitch: Number(event.target.value) }, "Voice pitch changed")} /></label><button type="button" className="h-9 rounded-lg border border-white/[0.09] text-[11px] text-white/48 transition hover:bg-white/[0.04] hover:text-white/72" onClick={() => updateAppearance({ voicePitch: 0 }, "Voice pitch reset")}>Reset pitch</button></div> : <p className="mt-4 rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2 text-[10px] leading-4 text-white/32">Player v{version} does not serialize voice pitch, so PlrForge leaves that field untouched.</p>}
            <div className="mt-5 grid grid-cols-7 gap-3 border-t border-white/[0.07] pt-5">
              {colors.map(({ key, label }) => { const value = character.appearance[key]; return <label key={key} className="text-[10px] text-white/38"><span className="mb-2 block">{label}</span><span className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.09] bg-black/20 px-2"><input aria-label={`${label} color`} type="color" className="size-6 cursor-pointer border-0 bg-transparent p-0" value={toHex(value)} onChange={(event) => updateAppearance({ [key]: fromHex(event.target.value) }, `${label} color changed`)} /><span className="font-mono text-[9px] uppercase text-white/42">{toHex(value)}</span></span></label>; })}
            </div>
          </section>

          <section className={`${cardClass} col-span-2`}>
            <SectionTitle icon={Sparkle} eyebrow="Permanent progression" title="Consumables and unlocks" detail="These flags represent character-bound permanent upgrades, not temporary buffs." />
            <div className="grid grid-cols-2 gap-2">
              {upgrades.map(({ key, label, detail }) => { const enabled = character.upgrades[key]; return <button type="button" role="switch" aria-checked={enabled} key={key} onClick={() => update({ upgrades: { ...character.upgrades, [key]: !enabled } }, `${label} ${enabled ? "disabled" : "enabled"}`, "Character · Permanent upgrades")} className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition ${enabled ? "border-emerald-300/16 bg-emerald-300/[0.045]" : "border-white/[0.07] bg-black/10 hover:bg-white/[0.025]"}`}><span className={`relative h-5 w-9 shrink-0 rounded-full transition ${enabled ? "bg-emerald-400/65" : "bg-white/10"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white/90 transition ${enabled ? "left-[18px]" : "left-0.5"}`} /></span><span><span className={`block text-[12px] font-medium ${enabled ? "text-white/80" : "text-white/48"}`}>{label}</span><span className="mt-0.5 block text-[10px] leading-4 text-white/28">{detail}</span></span></button>; })}
            </div>
          </section>

          <section className={`${cardClass} col-span-2`}>
            <SectionTitle icon={ChartBar} eyebrow="Records" title="Counters and tax savings" detail="Tax savings are stored as copper; the readable coin value updates alongside the exact integer." />
            <div className="grid grid-cols-3 gap-3">
              <label className="text-[11px] text-white/42">Tax Collector savings<input aria-label="Tax Collector savings" type="number" min={0} max={2147483647} className={`${fieldClass} font-mono`} value={character.counters.taxMoney} onChange={(event) => update({ counters: { ...character.counters, taxMoney: clamp(event.target.value, 0, 2147483647) } }, "Tax savings changed", "Character · Records")} /><span className="mt-2 block font-mono text-[9px] text-amber-200/48">{coinLabel(character.counters.taxMoney)}</span></label>
              <label className="text-[11px] text-white/42">PvE deaths<input aria-label="PvE deaths" type="number" min={0} max={2147483647} className={`${fieldClass} font-mono`} value={character.counters.pveDeaths} onChange={(event) => update({ counters: { ...character.counters, pveDeaths: clamp(event.target.value, 0, 2147483647) } }, "PvE death count changed", "Character · Records")} /></label>
              <label className="text-[11px] text-white/42">PvP deaths<input aria-label="PvP deaths" type="number" min={0} max={2147483647} className={`${fieldClass} font-mono`} value={character.counters.pvpDeaths} onChange={(event) => update({ counters: { ...character.counters, pvpDeaths: clamp(event.target.value, 0, 2147483647) } }, "PvP death count changed", "Character · Records")} /></label>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
