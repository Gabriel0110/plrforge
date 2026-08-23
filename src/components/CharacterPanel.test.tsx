import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { demoPlayer } from "../lib/demo";
import type { CharacterDocument } from "../types";
import { CharacterPanel } from "./CharacterPanel";

function Harness() {
  const [character, setCharacter] = useState<CharacterDocument>(demoPlayer.character);
  return <CharacterPanel character={character} version={325} onChange={(next) => setCharacter(next)} />;
}

describe("CharacterPanel", () => {
  it("edits identity and clamps values to verified v325 ranges", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Character name"), { target: { value: "12345678901234567890extra" } });
    expect((screen.getByLabelText("Character name") as HTMLInputElement).value).toBe("12345678901234567890");

    fireEvent.change(screen.getByLabelText("Maximum health"), { target: { value: "900" } });
    expect((screen.getByLabelText("Maximum health") as HTMLInputElement).value).toBe("500");

    fireEvent.change(screen.getByLabelText("Character difficulty"), { target: { value: "3" } });
    expect((screen.getByLabelText("Character difficulty") as HTMLSelectElement).value).toBe("3");
    expect(screen.getByText(/does not invent missing Journey research data/i)).toBeTruthy();
  });

  it("toggles permanent upgrades and edits exact RGB colors", () => {
    render(<Harness />);
    const loaf = screen.getByRole("switch", { name: /Artisan Loaf/i });
    expect(loaf.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(loaf);
    expect(loaf.getAttribute("aria-checked")).toBe("true");

    fireEvent.change(screen.getByLabelText("Hair color"), { target: { value: "#010203" } });
    expect(screen.getByText("#010203")).toBeTruthy();
  });

  it("hides fields v279 cannot serialize and derives its legacy voice from style", () => {
    const observed: { current?: CharacterDocument } = {};
    render(<CharacterPanel character={demoPlayer.character} version={279} onChange={(next) => { observed.current = next; }} />);

    expect(screen.queryByLabelText("Character team")).toBeNull();
    expect(screen.queryByLabelText("Voice variant")).toBeNull();
    expect(screen.queryByLabelText("Voice pitch")).toBeNull();
    expect(screen.getByText("Not stored by player v279")).toBeTruthy();
    expect(screen.getByText("Derived from character style")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Character style"), { target: { value: "5" } });
    expect(observed.current?.appearance.skinVariant).toBe(5);
    expect(observed.current?.appearance.voiceVariant).toBe(2);
    expect(observed.current?.appearance.voicePitch).toBe(0);
  });
});
