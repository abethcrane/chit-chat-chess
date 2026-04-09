import { prepareWithSegments, type PreparedTextWithSegments } from '@chenglou/pretext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { attribution, chitChatKicker, excerpt } from '../content/chessFlourish';
import { flowAroundMask, type ObstacleSpan } from '../pretext/flowAroundMask';

const FONT_PX = 17;
const FONT_SPEC = `${FONT_PX}px "Source Serif 4", Georgia, serif`;
const LINE_HEIGHT_MULT = 1.45;
const PAD = 20;
const KNIGHT_TARGET_W = 72;

type PieceKind = 'knightWhite' | 'knightBlack' | 'bishop';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function burstConfetti() {
  const root = document.createElement('div');
  root.className = 'confetti';
  root.setAttribute('aria-hidden', 'true');
  const colors = ['#2c2c2c', '#f7f7f2', '#c9a0a8', '#e8c4cc', '#8b6914', '#f5d0da'];
  for (let i = 0; i < 26; i++) {
    const bit = document.createElement('span');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[i % colors.length]!;
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    root.appendChild(bit);
  }
  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 2400);
}

function drawCheckerboardBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sq: number,
  light: string,
  dark: string,
) {
  for (let y = 0; y < h + sq; y += sq) {
    for (let x = 0; x < w + sq; x += sq) {
      const ix = Math.floor(x / sq) + Math.floor(y / sq);
      ctx.fillStyle = ix % 2 === 0 ? light : dark;
      ctx.fillRect(x, y, sq, sq);
    }
  }
}

export function PretextPlayfield() {
  const reducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const pieceRef = useRef({ x: 96, y: 72 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const clickRef = useRef({ count: 0, t: 0 });
  const whiteImgRef = useRef<HTMLImageElement | null>(null);
  const blackImgRef = useRef<HTMLImageElement | null>(null);
  const bishopImgRef = useRef<HTMLImageElement | null>(null);
  const [protection, setProtection] = useState(false);
  const [width, setWidth] = useState(320);
  const [knightsReady, setKnightsReady] = useState(false);
  const [pieceDims, setPieceDims] = useState({ w: KNIGHT_TARGET_W, h: KNIGHT_TARGET_W });
  const [activePiece, setActivePiece] = useState<PieceKind>('knightWhite');
  const maskRef = useRef<{
    w: number;
    h: number;
    alpha: Uint8ClampedArray;
  } | null>(null);

  const fullText =
    excerpt +
    '\n\n' +
    chitChatKicker +
    (protection
      ? ' (Horse protection: the treatise may not compress around Kevin.)'
      : '');

  useEffect(() => {
    preparedRef.current = prepareWithSegments(fullText, FONT_SPEC);
  }, [fullText]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const white = new Image();
    const black = new Image();
    const bishop = new Image();
    let remaining = 3;
    let cancelled = false;

    const finish = () => {
      remaining -= 1;
      if (remaining > 0 || cancelled) return;
      whiteImgRef.current = white.naturalWidth > 0 ? white : null;
      blackImgRef.current = black.naturalWidth > 0 ? black : null;
      bishopImgRef.current = bishop.naturalWidth > 0 ? bishop : null;
      if (white.naturalWidth > 0) {
        const ar = white.naturalWidth / white.naturalHeight || 1;
        const pw = KNIGHT_TARGET_W;
        const ph = Math.max(40, Math.round(pw / ar));
        setPieceDims({ w: pw, h: ph });
      }
      setKnightsReady(true);
    };

    white.onload = finish;
    black.onload = finish;
    bishop.onload = finish;
    white.onerror = finish;
    black.onerror = finish;
    bishop.onerror = finish;
    white.src = `${base}images/white-knight.png`;
    black.src = `${base}images/black-knight.png`;
    bishop.src = `${base}images/bishop.png`;

    return () => {
      cancelled = true;
    };
  }, []);

  const rebuildMaskIfNeeded = useCallback((img: HTMLImageElement | null) => {
    if (!img || !img.complete || img.naturalWidth <= 0) return;
    const w = Math.max(1, Math.round(pieceDims.w));
    const h = Math.max(1, Math.round(pieceDims.h));
    const existing = maskRef.current;
    if (existing && existing.w === w && existing.h === h) return;

    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement('canvas');
    const c = maskCanvasRef.current;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const alpha = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 3; i < alpha.length; i++, j += 4) alpha[i] = data[j]!;
    maskRef.current = { w, h, alpha };
  }, [pieceDims.h, pieceDims.w]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const prepared = preparedRef.current;
    if (!canvas || !prepared) return;

    if (!measureCanvasRef.current) measureCanvasRef.current = document.createElement('canvas');
    const mctx = measureCanvasRef.current.getContext('2d');
    if (!mctx) return;

    const cssW = width;
    const textLeft = PAD;
    const textRight = cssW - PAD;
    const textTop = PAD;
    const baseWidth = Math.max(120, textRight - textLeft);
    const lineStep = FONT_PX * LINE_HEIGHT_MULT;

    const pw = pieceDims.w;
    const ph = pieceDims.h;
    const { x: px, y: py } = pieceRef.current;

    const pieceImg =
      activePiece === 'bishop'
        ? bishopImgRef.current
        : activePiece === 'knightBlack'
          ? blackImgRef.current
          : whiteImgRef.current;

    rebuildMaskIfNeeded(pieceImg);

    const alphaMask = maskRef.current;
    const alphaThr = 18;

    const getSpanForRow = (rowTop: number, rowBottom: number): ObstacleSpan | null => {
      if (protection) return null;
      if (!alphaMask) return { startX: px, endX: px + pw };
      const yMid = (rowTop + rowBottom) * 0.5;
      const relY = yMid - py;
      if (relY < 0 || relY >= ph) return null;
      const iy = Math.max(0, Math.min(alphaMask.h - 1, Math.floor((relY / ph) * alphaMask.h)));
      let minX = Infinity;
      let maxX = -Infinity;
      const rowOff = iy * alphaMask.w;
      for (let ix = 0; ix < alphaMask.w; ix++) {
        if (alphaMask.alpha[rowOff + ix]! > alphaThr) {
          if (ix < minX) minX = ix;
          if (ix > maxX) maxX = ix;
        }
      }
      if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;
      const startX = px + (minX / alphaMask.w) * pw;
      const endX = px + ((maxX + 1) / alphaMask.w) * pw;
      return { startX, endX };
    };

    const flowOpts = {
      textLeft,
      textRight,
      textTop,
      baseWidth,
      lineStep,
      gap: 10,
      minColumn: 56,
      getObstacleSpanForRow: getSpanForRow,
    };

    const contentH = flowAroundMask(prepared, mctx, FONT_SPEC, '#1a1a1a', flowOpts);
    const cssH = Math.max(
      300,
      Math.ceil(textTop + contentH + PAD + 28),
      Math.ceil(py + ph + PAD + 16),
    );

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCheckerboardBg(ctx, cssW, cssH, 26, '#f4f3ef', '#e4e2dc');

    flowAroundMask(prepared, ctx, FONT_SPEC, '#1a1a1a', flowOpts);

    const pieceX = px;
    const pieceY = py;

    if (pieceImg && knightsReady && pieceImg.complete && pieceImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(pieceImg, pieceX, pieceY, pw, ph);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(pieceX, pieceY, pw, ph);
      ctx.strokeStyle = '#2c2c2c';
      ctx.lineWidth = 2;
      ctx.strokeRect(pieceX, pieceY, pw, ph);
      ctx.font = '12px Source Serif 4, Georgia, serif';
      ctx.fillStyle = '#2c2c2c';
      ctx.fillText('♘', pieceX + pw / 2 - 4, pieceY + ph / 2 - 6);
    }

    if (protection) {
      ctx.strokeStyle = 'rgba(183, 110, 121, 0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(pieceX - 6, pieceY - 6, pw + 12, ph + 12);
      ctx.setLineDash([]);
    }
  }, [width, protection, knightsReady, pieceDims.h, pieceDims.w, rebuildMaskIfNeeded, activePiece]);

  useEffect(() => {
    paint();
  }, [paint, fullText]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.floor(cr.width);
      if (w >= 80) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { x: px, y: py } = pieceRef.current;
    const pw = pieceDims.w;
    const ph = pieceDims.h;
    const hit = x >= px && x <= px + pw && y >= py && y <= py + ph;
    if (!hit) return;
    canvas.setPointerCapture(e.pointerId);
    dragRef.current = { dx: x - px, dy: y - py };

    const now = performance.now();
    if (now - clickRef.current.t < 520) {
      clickRef.current.count += 1;
    } else {
      clickRef.current.count = 1;
    }
    clickRef.current.t = now;
    if (clickRef.current.count >= 3) {
      clickRef.current.count = 0;
      setProtection((p) => {
        if (!p) burstConfetti();
        return !p;
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pw = pieceDims.w;
    const ph = pieceDims.h;
    const x = e.clientX - rect.left - dragRef.current.dx;
    const y = e.clientY - rect.top - dragRef.current.dy;
    const maxX = rect.width - pw;
    const maxY = rect.height - ph;
    pieceRef.current = {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
    paint();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const staticCopy = (
    <div className="static-prose">
      <p>{excerpt}</p>
      <p>
        <em>{chitChatKicker}</em>
      </p>
      <cite>{attribution}</cite>
    </div>
  );

  if (reducedMotion) {
    return (
      <div className="playfield-wrap">
        <p className="sr-only">
          {excerpt} {chitChatKicker} {attribution}
        </p>
        {staticCopy}
        <p className="playfield-hint">
          Motion is reduced on your device — we skipped the draggable knight demo.
        </p>
      </div>
    );
  }

  return (
    <div className="playfield-wrap">
      <p className="sr-only">
        {excerpt} {chitChatKicker} {attribution}. Drag Kevin; text reflows around him. Triple activation
        toggles horse protection.
      </p>
      <div ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Draggable knight; text wraps around the piece"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="piece-dock" aria-label="Piece dock">
        <button
          type="button"
          className={`piece-dock__piece ${activePiece === 'knightWhite' ? 'is-active' : ''}`}
          onClick={() => setActivePiece('knightWhite')}
        >
          <img src={`${import.meta.env.BASE_URL}images/white-knight.png`} alt="" />
          <span>Knight</span>
        </button>
        <button
          type="button"
          className={`piece-dock__piece ${activePiece === 'knightBlack' ? 'is-active' : ''}`}
          onClick={() => setActivePiece('knightBlack')}
        >
          <img src={`${import.meta.env.BASE_URL}images/black-knight.png`} alt="" />
          <span>Knight (dark)</span>
        </button>
        <button
          type="button"
          className={`piece-dock__piece ${activePiece === 'bishop' ? 'is-active' : ''}`}
          onClick={() => setActivePiece('bishop')}
        >
          <img src={`${import.meta.env.BASE_URL}images/bishop.png`} alt="" />
          <span>Bishop</span>
        </button>
      </div>
      <p className="playfield-hint">
        The treatise has to share the row with him now. Triple-tap for <strong>horse protection</strong>{' '}
        (rose ring + moody black Kevin).
      </p>
    </div>
  );
}
