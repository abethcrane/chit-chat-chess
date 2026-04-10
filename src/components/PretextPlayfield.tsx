import { prepareWithSegments, type PreparedTextWithSegments } from '@chenglou/pretext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attribution } from '../content/chessFlourish';
import { type InstructionSection, type PieceType } from '../chess-game';
import { flowAroundMask, type ObstacleSpan } from '../pretext/flowAroundMask';

const FONT_PX = 17;
const FONT_SPEC = `${FONT_PX}px "Source Serif 4", Georgia, serif`;
const LINE_HEIGHT_MULT = 1.45;
const PAD = 20;
const PIECE_TARGET_W = 72;

type PieceKind = 'knightWhite' | 'knightBlack' | 'bishop' | 'king' | 'queen' | 'rook' | 'pawn';

export type PretextPlayfieldProps = {
  canvasCaption: string;
  instructionSections: InstructionSection[];
  enabledPieceTypes: ReadonlySet<PieceType>;
};

type DockDef = { kind: PieceKind; label: string; path: string; pieceType: PieceType };

const DOCK_ITEMS: DockDef[] = [
  { kind: 'knightWhite', label: 'Knight (Kevin)', path: 'images/pieces/white-knight1.png', pieceType: 'N' },
  { kind: 'knightBlack', label: 'Knight (Kayla)', path: 'images/pieces/black-knight2.png', pieceType: 'N' },
  { kind: 'bishop', label: 'Bishop', path: 'images/pieces/white-bishop.png', pieceType: 'B' },
  { kind: 'king', label: 'King', path: 'images/pieces/white-king.png', pieceType: 'K' },
  { kind: 'queen', label: 'Queen', path: 'images/pieces/white-queen.png', pieceType: 'Q' },
  { kind: 'rook', label: 'Rook', path: 'images/pieces/white-rook.png', pieceType: 'R' },
  { kind: 'pawn', label: 'Pawn', path: 'images/pieces/white-pawn.png', pieceType: 'P' },
];

function activePieceToHero(kind: PieceKind): { type: PieceType; color: 'w' | 'b' } {
  if (kind === 'knightBlack') return { type: 'N', color: 'b' };
  return {
    type:
      kind === 'knightWhite'
        ? 'N'
        : kind === 'bishop'
          ? 'B'
          : kind === 'king'
            ? 'K'
            : kind === 'queen'
              ? 'Q'
              : kind === 'rook'
                ? 'R'
                : 'P',
    color: 'w',
  };
}

function pieceTypeForKind(kind: PieceKind): PieceType {
  return activePieceToHero(kind).type;
}

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

function burstHearts() {
  const root = document.createElement('div');
  root.className = 'hearts';
  root.setAttribute('aria-hidden', 'true');
  const hearts = ['♥', '♡', '❦'];
  for (let i = 0; i < 18; i++) {
    const bit = document.createElement('span');
    bit.textContent = hearts[i % hearts.length]!;
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.color = i % 3 === 0 ? '#b76e79' : i % 3 === 1 ? '#c9a0a8' : '#8b4a5c';
    bit.style.animationDelay = `${Math.random() * 0.22}s`;
    root.appendChild(bit);
  }
  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 2000);
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

function InstructionSheet({ sections }: { sections: InstructionSection[] }) {
  if (sections.length === 0) {
    return (
      <div className="instruction-sheet">
        <p className="instruction-sheet__empty">Enable at least one piece type above to see how it moves.</p>
      </div>
    );
  }
  return (
    <div className="instruction-sheet">
      <h3 className="instruction-sheet__main-title">How the enabled pieces move</h3>
      {sections.map((s) => (
        <section key={s.id} className="instruction-sheet__block">
          <h4 className="instruction-sheet__title">{s.title}</h4>
          <ul className="instruction-sheet__list">
            {s.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="instruction-sheet__cite">
        <cite>{attribution}</cite>
      </p>
    </div>
  );
}

export function PretextPlayfield({ canvasCaption, instructionSections, enabledPieceTypes }: PretextPlayfieldProps) {
  const reducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const pieceRef = useRef({ x: 96, y: 72 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  // (Reserved for future: multi-gesture interactions.)
  const whiteImgRef = useRef<HTMLImageElement | null>(null);
  const blackImgRef = useRef<HTMLImageElement | null>(null);
  const bishopImgRef = useRef<HTMLImageElement | null>(null);
  const kingImgRef = useRef<HTMLImageElement | null>(null);
  const queenImgRef = useRef<HTMLImageElement | null>(null);
  const rookImgRef = useRef<HTMLImageElement | null>(null);
  const pawnImgRef = useRef<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(320);
  const [knightsReady, setKnightsReady] = useState(false);
  const [pieceDims, setPieceDims] = useState({ w: PIECE_TARGET_W, h: PIECE_TARGET_W });
  const [activePiece, setActivePiece] = useState<PieceKind>('knightWhite');
  const [quip, setQuip] = useState<string | null>(null);
  const quipTimerRef = useRef<number | null>(null);
  const maskRef = useRef<{
    w: number;
    h: number;
    alpha: Uint8ClampedArray;
  } | null>(null);

  const plainSr = useMemo(
    () =>
      instructionSections.map((s) => `${s.title}: ${s.bullets.join('; ')}`).join(' ') + ` ${attribution}`,
    [instructionSections],
  );

  useEffect(() => {
    if (!enabledPieceTypes.has(pieceTypeForKind(activePiece))) {
      const first = DOCK_ITEMS.find((d) => enabledPieceTypes.has(d.pieceType));
      if (first) setActivePiece(first.kind);
    }
  }, [enabledPieceTypes, activePiece]);

  const fullText = canvasCaption;

  useEffect(() => {
    preparedRef.current = prepareWithSegments(fullText, FONT_SPEC);
  }, [fullText]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const white = new Image();
    const black = new Image();
    const bishop = new Image();
    const king = new Image();
    const queen = new Image();
    const rook = new Image();
    const pawn = new Image();
    let remaining = 7;
    let cancelled = false;

    const finish = () => {
      remaining -= 1;
      if (remaining > 0 || cancelled) return;
      whiteImgRef.current = white.naturalWidth > 0 ? white : null;
      blackImgRef.current = black.naturalWidth > 0 ? black : null;
      bishopImgRef.current = bishop.naturalWidth > 0 ? bishop : null;
      kingImgRef.current = king.naturalWidth > 0 ? king : null;
      queenImgRef.current = queen.naturalWidth > 0 ? queen : null;
      rookImgRef.current = rook.naturalWidth > 0 ? rook : null;
      pawnImgRef.current = pawn.naturalWidth > 0 ? pawn : null;
      // Initialize dimensions from whichever piece is active (default knightWhite).
      const initImg =
        whiteImgRef.current ??
        bishopImgRef.current ??
        kingImgRef.current ??
        queenImgRef.current ??
        rookImgRef.current ??
        pawnImgRef.current ??
        blackImgRef.current;
      if (initImg?.naturalWidth) {
        const ar = initImg.naturalWidth / initImg.naturalHeight || 1;
        const pw = PIECE_TARGET_W;
        const ph = Math.max(40, Math.round(pw / ar));
        setPieceDims({ w: pw, h: ph });
      }
      setKnightsReady(true);
    };

    white.onload = finish;
    black.onload = finish;
    bishop.onload = finish;
    king.onload = finish;
    queen.onload = finish;
    rook.onload = finish;
    pawn.onload = finish;
    white.onerror = finish;
    black.onerror = finish;
    bishop.onerror = finish;
    king.onerror = finish;
    queen.onerror = finish;
    rook.onerror = finish;
    pawn.onerror = finish;
    white.src = `${base}images/pieces/white-knight1.png`;
    black.src = `${base}images/pieces/black-knight2.png`;
    bishop.src = `${base}images/pieces/white-bishop.png`;
    king.src = `${base}images/pieces/white-king.png`;
    queen.src = `${base}images/pieces/white-queen.png`;
    rook.src = `${base}images/pieces/white-rook.png`;
    pawn.src = `${base}images/pieces/white-pawn.png`;

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const img =
      activePiece === 'bishop'
        ? bishopImgRef.current
        : activePiece === 'king'
          ? kingImgRef.current
          : activePiece === 'queen'
            ? queenImgRef.current
            : activePiece === 'rook'
              ? rookImgRef.current
              : activePiece === 'pawn'
                ? pawnImgRef.current
                : activePiece === 'knightBlack'
                  ? blackImgRef.current
                  : whiteImgRef.current;
    if (!img?.naturalWidth) return;
    const ar = img.naturalWidth / img.naturalHeight || 1;
    const pw = PIECE_TARGET_W;
    const ph = Math.max(40, Math.round(pw / ar));
    setPieceDims({ w: pw, h: ph });
    // Force mask rebuild for new shape/size.
    maskRef.current = null;
  }, [activePiece]);

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
        : activePiece === 'king'
          ? kingImgRef.current
          : activePiece === 'queen'
            ? queenImgRef.current
            : activePiece === 'rook'
              ? rookImgRef.current
              : activePiece === 'pawn'
                ? pawnImgRef.current
                : activePiece === 'knightBlack'
                  ? blackImgRef.current
                  : whiteImgRef.current;

    rebuildMaskIfNeeded(pieceImg);

    const alphaMask = maskRef.current;
    const alphaThr = 18;

    const bubble = 0;

    const getSpanForRow = (rowTop: number, rowBottom: number): ObstacleSpan | null => {
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
      const startX = px + (minX / alphaMask.w) * pw - bubble;
      const endX = px + ((maxX + 1) / alphaMask.w) * pw + bubble;
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

  }, [width, knightsReady, pieceDims.h, pieceDims.w, rebuildMaskIfNeeded, activePiece]);

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

    const say = (() => {
      switch (activePiece) {
        case 'knightWhite':
        case 'knightBlack':
          return "please don’t take my horse i love him";
        case 'bishop':
          return 'my hat is not a handle. i am a delicate little lad.';
        case 'king':
          return 'i can’t move there, it’s simply not safe for me (emotionally).';
        case 'queen':
          return 'i will do anything for you but i will complain the whole time.';
        case 'rook':
          return 'straight lines only. do not ask me to be cute about it.';
        case 'pawn':
          return 'i’m just a little guy. i’m doing my best.';
      }
    })();
    setQuip(say);
    burstHearts();
    if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => setQuip(null), 1400);

    // (No more triple-tap protection mode.)
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
    paint();
  };

  const staticCopy = (
    <div className="static-prose">
      <InstructionSheet sections={instructionSections} />
      <p>{canvasCaption}</p>
    </div>
  );

  const baseUrl = import.meta.env.BASE_URL;
  const visibleDock = DOCK_ITEMS.filter((d) => enabledPieceTypes.has(d.pieceType));

  if (reducedMotion) {
    return (
      <div className="playfield-wrap">
        <p className="sr-only">{plainSr}</p>
        {staticCopy}
        <p className="playfield-hint">
          Motion is reduced on your device — we skipped the draggable piece demo.
        </p>
      </div>
    );
  }

  return (
    <div className="playfield-wrap">
      <p className="sr-only">{plainSr}. {canvasCaption}</p>
      <InstructionSheet sections={instructionSections} />
      <div ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Draggable piece; text flows around it"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="piece-dock" aria-label="Piece dock">
        {visibleDock.map((d) => (
          <button
            key={d.kind}
            type="button"
            className={`piece-dock__piece ${activePiece === d.kind ? 'is-active' : ''}`}
            onClick={() => setActivePiece(d.kind)}
          >
            <img src={`${baseUrl}${d.path}`} alt="" />
            <span className="pixel-label">{d.label}</span>
          </button>
        ))}
      </div>
      {quip ? <div className="speech-bubble" role="status">{quip}</div> : null}
      <p className="playfield-hint">
        Pick a piece silhouette, then drag it anywhere on the canvas — it stays where you put it while the paragraph
        wraps around it.
      </p>
    </div>
  );
}
