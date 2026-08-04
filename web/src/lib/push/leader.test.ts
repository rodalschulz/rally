import { describe, expect, it } from "vitest";
import { detectLeaderChange, leaderIdFromRows } from "./leader";

describe("detectLeaderChange", () => {
  it("returns change when leaders differ", () => {
    expect(detectLeaderChange("ana", "bruno")).toEqual({
      previousId: "ana",
      nextId: "bruno",
    });
  });

  it("returns null when same or missing", () => {
    expect(detectLeaderChange("ana", "ana")).toBeNull();
    expect(detectLeaderChange(null, "bruno")).toBeNull();
    expect(detectLeaderChange("ana", null)).toBeNull();
  });
});

describe("leaderIdFromRows", () => {
  it("reads first row", () => {
    expect(
      leaderIdFromRows([{ playerId: "a" }, { playerId: "b" }]),
    ).toBe("a");
    expect(leaderIdFromRows([])).toBeNull();
  });
});
