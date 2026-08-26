import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const open = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => path,
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("0.2.1"),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => open(...args),
}));

import { choosePlayerFile } from "./native";

describe("choosePlayerFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__TAURI_INTERNALS__ = {};
    open.mockResolvedValue(null);
  });

  it("starts in the detected Terraria Players directory", async () => {
    invoke.mockResolvedValue("/Users/test/Library/Application Support/Terraria/Players");

    await choosePlayerFile();

    expect(invoke).toHaveBeenCalledWith("default_player_directory");
    expect(open).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: "/Users/test/Library/Application Support/Terraria/Players",
      filters: [{ name: "Terraria player", extensions: ["plr"] }],
    }));
  });

  it("still opens the picker if the default directory cannot be resolved", async () => {
    invoke.mockRejectedValue(new Error("unavailable"));

    await choosePlayerFile();

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: undefined }));
  });
});
