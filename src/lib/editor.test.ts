import { describe, expect, it } from "vitest";
import { editableDocument, editorReducer, initialEditorState, replaceItemAt } from "./editor";
import { demoPlayer } from "./demo";

describe("editor history", () => {
  it("undoes and redoes a slot replacement", () => {
    const document = editableDocument(demoPlayer);
    const original = initialEditorState(document);
    const nextDocument = replaceItemAt(document, { area: "inventory", slot: 18 }, { itemId: 75, stack: 2 });
    const changed = editorReducer(original, {
      type: "change",
      document: nextDocument,
      entry: { id: "one", location: "Inventory 19", description: "Fallen Star added" },
    });
    expect(changed.inventory[18].itemId).toBe(75);
    const undone = editorReducer(changed, { type: "undo" });
    expect(undone.inventory[18].itemId).toBe(3043);
    const redone = editorReducer(undone, { type: "redo" });
    expect(redone.inventory[18].itemId).toBe(75);
  });

  it("keeps storage and equipment in the same undo snapshot", () => {
    const document = editableDocument(demoPlayer);
    const withSafeItem = replaceItemAt(document, { area: "storage", storage: "safe", slot: 3 }, { itemId: 3043, stack: 1 });
    const changed = editorReducer(initialEditorState(document), {
      type: "change",
      document: withSafeItem,
      entry: { id: "safe", location: "Safe 4", description: "Magic Lantern added" },
    });
    expect(changed.storage.safe[3].itemId).toBe(3043);
    expect(editorReducer(changed, { type: "undo" }).storage.safe[3].itemId).toBe(0);
  });

  it("includes character edits in the shared undo history", () => {
    const document = editableDocument(demoPlayer);
    const changed = editorReducer(initialEditorState(document), {
      type: "change",
      document: {
        ...document,
        character: { ...document.character, name: "Forged Hero" },
      },
      entry: { id: "character", location: "Character · Identity", description: "Character name changed" },
    });
    expect(changed.character.name).toBe("Forged Hero");
    expect(editorReducer(changed, { type: "undo" }).character.name).toBe("NewBruv");
  });

  it("keeps effects, Journey data, and spawn points in the same history", () => {
    const document = editableDocument(demoPlayer);
    const changed = editorReducer(initialEditorState(document), {
      type: "change",
      document: {
        ...document,
        effects: { buffs: document.effects.buffs.map((buff) => buff.slot === 0 ? { ...buff, buffId: 5, time: 3600 } : buff) },
        journey: { ...document.journey, powers: { ...document.journey.powers, godmode: true } },
        spawnPoints: [...document.spawnPoints, { x: 1, y: 2, worldId: 3, worldName: "Test" }],
      },
      entry: { id: "systems", location: "Character systems", description: "Systems changed" },
    });
    expect(changed.effects.buffs[0].buffId).toBe(5);
    expect(changed.journey.powers.godmode).toBe(true);
    expect(changed.spawnPoints).toHaveLength(2);
    const undone = editorReducer(changed, { type: "undo" });
    expect(undone.effects.buffs[0].buffId).toBe(0);
    expect(undone.journey.powers.godmode).toBe(false);
    expect(undone.spawnPoints).toHaveLength(1);
  });
});
