import { layoutNextLine, type LayoutCursor, type PreparedTextWithSegments } from '@chenglou/pretext';

const START: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

function isFinished(prepared: PreparedTextWithSegments, cursor: LayoutCursor, maxWidth: number) {
  return layoutNextLine(prepared, cursor, maxWidth) === null;
}

export type FlowAroundOptions = {
  textLeft: number;
  textRight: number;
  textTop: number;
  baseWidth: number;
  lineStep: number;
  obstacle: { x: number; y: number; w: number; h: number };
  gap: number;
  minColumn: number;
};

/**
 * Lays out prepared text with `layoutNextLine`, splitting rows around a rectangular obstacle
 * (left column, then right column on the same baseline when the row intersects the box).
 */
export function flowAroundObstacle(
  prepared: PreparedTextWithSegments,
  ctx: CanvasRenderingContext2D,
  font: string,
  fillStyle: string,
  opts: FlowAroundOptions,
): number {
  const { textLeft, textRight, textTop, baseWidth, lineStep, gap, minColumn } = opts;
  const { x: ox, y: oy, w: ow, h: oh } = opts.obstacle;

  let cursor: LayoutCursor = { ...START };
  let y = textTop;
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  ctx.textBaseline = 'top';

  let guard = 0;
  const maxGuard = 5000;

  while (guard++ < maxGuard) {
    if (isFinished(prepared, cursor, baseWidth)) break;

    const rowTop = y;
    const rowBottom = y + lineStep;
    const overlapsY = rowBottom > oy && rowTop < oy + oh;
    const obstacleSpansText =
      Math.min(ox + ow, textRight) > Math.max(ox, textLeft) &&
      Math.max(ox, textLeft) < textRight &&
      Math.min(ox + ow, textRight) > textLeft;

    const splitRow = overlapsY && obstacleSpansText;

    if (!splitRow) {
      const line = layoutNextLine(prepared, cursor, baseWidth);
      if (!line) break;
      ctx.fillText(line.text, textLeft, y);
      cursor = line.end;
      y += lineStep;
      continue;
    }

    let wLeft = ox - gap - textLeft;
    let wRight = textRight - gap - (ox + ow);
    if (wLeft < minColumn) wLeft = 0;
    if (wRight < minColumn) wRight = 0;

    let advanced = false;

    if (wLeft > 0) {
      const lineL = layoutNextLine(prepared, cursor, wLeft);
      if (lineL) {
        if (lineL.text.length > 0) {
          ctx.fillText(lineL.text, textLeft, y);
        }
        cursor = lineL.end;
        advanced = true;
      }
    }

    if (wRight > 0) {
      const lineR = layoutNextLine(prepared, cursor, wRight);
      if (lineR) {
        if (lineR.text.length > 0) {
          ctx.fillText(lineR.text, ox + ow + gap, y);
        }
        cursor = lineR.end;
        advanced = true;
      }
    }

    if (!advanced) {
      const line = layoutNextLine(prepared, cursor, baseWidth);
      if (!line) break;
      ctx.fillText(line.text, textLeft, y);
      cursor = line.end;
    }

    y += lineStep;
  }

  return y - textTop;
}
