import { describe, expect, it } from "vitest";
import { clampChartTooltipLeft } from "./clampChartTooltip";

describe("clampChartTooltipLeft", () => {
  it("centers on the point when there is room", () => {
    // container 200, tooltip 80, pad 8, ratio 0.5 → point 100, left 60
    expect(clampChartTooltipLeft(200, 80, 0.5, 8)).toBe(60);
  });

  it("clamps to the right edge", () => {
    // point at the far right: 200 - 80 - 8 = 112
    expect(clampChartTooltipLeft(200, 80, 1, 8)).toBe(112);
  });

  it("clamps to the left edge", () => {
    expect(clampChartTooltipLeft(200, 80, 0, 8)).toBe(8);
  });
});
