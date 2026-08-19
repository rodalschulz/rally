/** Keep a chart tooltip fully inside its container (no overflow on either edge). */
export function clampChartTooltipLeft(
  containerWidth: number,
  tooltipWidth: number,
  pointXRatio: number,
  edgePad = 8,
): number {
  if (containerWidth <= 0) return edgePad;
  const width = Math.min(tooltipWidth, containerWidth - edgePad * 2);
  const pointX = pointXRatio * containerWidth;
  const raw = pointX - width / 2;
  const max = Math.max(edgePad, containerWidth - width - edgePad);
  return Math.min(Math.max(raw, edgePad), max);
}
