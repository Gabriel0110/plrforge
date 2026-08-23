import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { demoPlayer } from "../lib/demo";
import type { EffectsDocument, JourneyDocument, SpawnPoint } from "../types";
import { EffectsPanel } from "./EffectsPanel";
import { JourneyPanel } from "./JourneyPanel";
import { SpawnPointsPanel } from "./SpawnPointsPanel";

function EffectsHarness() {
  const [effects, setEffects] = useState<EffectsDocument>(demoPlayer.effects);
  return <EffectsPanel effects={effects} onChange={(next) => setEffects(next)} />;
}

function JourneyHarness() {
  const [journey, setJourney] = useState<JourneyDocument>(demoPlayer.journey);
  return <JourneyPanel journey={journey} difficulty={3} onChange={(next) => setJourney(next)} />;
}

function SpawnsHarness() {
  const [points, setPoints] = useState<SpawnPoint[]>(demoPlayer.spawnPoints);
  return <SpawnPointsPanel points={points} onChange={(next) => setPoints(next)} />;
}

describe("remaining character-system panels", () => {
  it("searches for and adds a saved buff with an editable duration", () => {
    render(<EffectsHarness />);
    fireEvent.change(screen.getByLabelText("Find a buff by name or ID"), { target: { value: "Ironskin" } });
    fireEvent.click(screen.getByRole("button", { name: /Ironskin/i }));
    expect(screen.getByLabelText("Ironskin duration ticks")).toBeTruthy();
    expect((screen.getByLabelText("Ironskin duration ticks") as HTMLInputElement).value).toBe("36000");
  });

  it("completes tracked research and toggles a serialized Journey power", () => {
    render(<JourneyHarness />);
    const godmode = screen.getByRole("switch", { name: /Godmode/i });
    expect(godmode.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(godmode);
    expect(godmode.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Complete all tracked" }));
    expect((screen.getByLabelText("Magic Lantern research count") as HTMLInputElement).value).toBe("9999");
  });

  it("adds, edits, and removes named spawn records", () => {
    render(<SpawnsHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Add spawn point" }));
    const secondName = screen.getByLabelText("Spawn 2 world name") as HTMLInputElement;
    fireEvent.change(secondName, { target: { value: "Second World" } });
    fireEvent.change(screen.getByLabelText("Spawn 2 world ID"), { target: { value: "424242" } });
    fireEvent.change(screen.getByLabelText("Spawn 2 X coordinate"), { target: { value: "515" } });
    fireEvent.change(screen.getByLabelText("Spawn 2 Y coordinate"), { target: { value: "220" } });
    expect(secondName.value).toBe("Second World");
    expect((screen.getByLabelText("Spawn 2 world ID") as HTMLInputElement).value).toBe("424242");
    expect((screen.getByLabelText("Spawn 2 X coordinate") as HTMLInputElement).value).toBe("515");
    expect((screen.getByLabelText("Spawn 2 Y coordinate") as HTMLInputElement).value).toBe("220");
    fireEvent.click(screen.getByRole("button", { name: "Remove spawn point 2" }));
    expect(screen.queryByLabelText("Spawn 2 world name")).toBeNull();
  });
});
