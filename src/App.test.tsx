import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoPlayer } from "./lib/demo";

const discoverPlayers = vi.fn();
const inspectPlayer = vi.fn();
const loadPlayer = vi.fn();

vi.mock("./lib/native", () => ({
  appVersion: vi.fn().mockResolvedValue("0.2.1"),
  bundledVersion: "0.2.1",
  checkForUpdates: vi.fn(),
  choosePlayerFile: vi.fn().mockResolvedValue(null),
  chooseTerrariaFolder: vi.fn().mockResolvedValue(null),
  discoverPlayers: (...args: unknown[]) => discoverPlayers(...args),
  gameAssetUrl: vi.fn(),
  inspectPlayer: (...args: unknown[]) => inspectPlayer(...args),
  isDesktop: () => true,
  loadGameItemMetadata: vi.fn(),
  loadGameItemVariants: vi.fn(),
  loadPlayer: (...args: unknown[]) => loadPlayer(...args),
  openReleasePage: vi.fn(),
  prepareGameAssets: vi.fn(),
  savePlayer: vi.fn(),
}));

import App from "./App";

const path = "/Players/Hero.plr";
const discovered = {
  path,
  name: "Hero",
  version: 325,
  modifiedAt: 1,
  compatibility: {
    state: "supported" as const,
    fileVersion: 325,
    formatLabel: "Terraria player v325",
    canEdit: true,
    message: "Verified.",
  },
};
const document = {
  ...demoPlayer,
  path,
  character: { ...demoPlayer.character, name: "Hero" },
};

async function openDiscoveredPlayer() {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /Hero.*Verified.*File version 325/ }));
  await screen.findByRole("button", { name: "Players" });
}

describe("player switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discoverPlayers.mockResolvedValue([discovered]);
    inspectPlayer.mockResolvedValue(discovered.compatibility);
    loadPlayer.mockResolvedValue(document);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("returns to a freshly discovered player list without restarting", async () => {
    await openDiscoveredPlayer();

    fireEvent.click(screen.getByRole("button", { name: "Players" }));

    expect(await screen.findByRole("heading", { name: "Open a player without gambling the save." })).toBeTruthy();
    await waitFor(() => expect(discoverPlayers).toHaveBeenCalledTimes(2));
  });

  it("does not leave an edited player unless discarding changes is confirmed", async () => {
    await openDiscoveredPlayer();
    fireEvent.click(screen.getByRole("button", { name: "Character" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Character name" }), { target: { value: "Edited Hero" } });
    vi.mocked(window.confirm).mockReturnValue(false);

    fireEvent.click(screen.getByRole("button", { name: "Players" }));

    expect(window.confirm).toHaveBeenCalledWith("Discard your unsaved changes and return to the player list?");
    expect((screen.getByRole("textbox", { name: "Character name" }) as HTMLInputElement).value).toBe("Edited Hero");
  });
});
