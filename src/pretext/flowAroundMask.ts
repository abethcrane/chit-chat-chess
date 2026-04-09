import { layoutNextLine, type LayoutCursor, type PreparedTextWithSegments } from '@chenglou/pretext';

const START: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

function isFinished(prepared: PreparedTextWithSegments, cursor: LayoutCursor, maxWidth: number) {
  return layoutNextLine(prepared, cursor, maxWidth) === null;
}

export type ObstacleSpan = { startX: number; endX: number };

export type FlowAroundMaskOptions = {
  textLeft: number;
  textRight: number;
  textTop: number;
  baseWidth: number;
  lineStep: number;
  gap: number;
  minColumn: number;
  /**
   * For a given row, return the blocked X interval in canvas coordinates.
   * Return null for “no obstacle this row”.
   */
  getObstacleSpanForRow: (rowTop: number, rowBottom: number) => ObstacleSpan | null;
};

/**
 * Layout text with `layoutNextLine`, splitting around an obstacle span per-row.
 *
 * This is a greedy 2-column flow: left line, then right line on same baseline.
 * Works well for a single silhouette obstacle (e.g. a knight PNG).
 */
export function flowAroundMask(
  prepared: PreparedTextWithSegments,
  ctx: CanvasRenderingContext2D,
  font: string,
  fillStyle: string,
  opts: FlowAroundMaskOptions,
): number {
  const { textLeft, textRight, textTop, baseWidth, lineStep, gap, minColumn, getObstacleSpanForRow } =
    opts;

  let cursor: LayoutCursor = { ...START };
  let y = textTop;
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  ctx.textBaseline = 'top';

  let guard = 0;
  const maxGuard = 6000;

  while (guard++ < maxGuard) {
    if (isFinished(prepared, cursor, baseWidth)) break;

    const rowTop = y;
    const rowBottom = y + lineStep;
    const span = getObstacleSpanForRow(rowTop, rowBottom);

    if (!span) {
      const line = layoutNextLine(prepared, cursor, baseWidth);
      if (!line) break;
      if (line.text.length > 0) ctx.fillText(line.text, textLeft, y);
      cursor = line.end;
      y += lineStep;
      continue;
    }

    const clippedStart = Math.max(textLeft, Math.min(textRight, span.startX));
    const clippedEnd = Math.max(textLeft, Math.min(textRight, span.endX));
    const usable = clippedEnd > clippedStart;

    if (!usable) {
      const line = layoutNextLine(prepared, cursor, baseWidth);
      if (!line) break;
      if (line.text.length > 0) ctx.fillText(line.text, textLeft, y);
      cursor = line.end;
      y += lineStep;
      continue;
    }

    let wLeft = clippedStart - gap - textLeft;
    let wRight = textRight - gap - clippedEnd;
    if (wLeft < minColumn) wLeft = 0;
    if (wRight < minColumn) wRight = 0;

    let advanced = false;

    if (wLeft > 0) {
      const lineL = layoutNextLine(prepared, cursor, wLeft);
      if (lineL) {
        if (lineL.text.length > 0) ctx.fillText(lineL.text, textLeft, y);
        cursor = lineL.end;
        advanced = true;
      }
    }

    if (wRight > 0) {
      const lineR = layoutNextLine(prepared, cursor, wRight);
      if (lineR) {
        if (lineR.text.length > 0) ctx.fillText(lineR.text, clippedEnd + gap, y);
        cursor = lineR.end;
        advanced = true;
      }
    }

    if (!advanced) {
      const line = layoutNextLine(prepared, cursor, baseWidth);
      if (!line) break;
      if (line.text.length > 0) ctx.fillText(line.text, textLeft, y);
      cursor = line.end;
    }

    y += lineStep;
  }

  return y - textTop;
}

