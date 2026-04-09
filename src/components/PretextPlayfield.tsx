import { prepareWithSegments, layoutWithLines, type PreparedTextWithSegments } from '@chenglou/pretext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { attribution, chitChatKicker, excerpt } from '../content/chessFlourish';

const FONT_PX = 17;
const FONT_SPEC = `${FONT_PX}px "Source Serif 4", Georgia, serif`;
const LINE_HEIGHT_MULT = 1.45;
const PAD = 20;
const PIECE_SIZE = 56;

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
  const colors = ['#c9b8a4', '#6b4e3d', '#e8dfd2', '#f0e8db', '#1e1a16'];
  for (let i = 0; i < 22; i++) {
    const bit = document.createElement('span');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[i % colors.length]!;
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    root.appendChild(bit);
  }
  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 2400);
}

function drawPieceBg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function PretextPlayfield() {
  const reducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const pieceRef = useRef({ x: 120, y: 80 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const lastHeightRef = useRef(220);
  const clickRef = useRef({ count: 0, t: 0 });
  const [protection, setProtection] = useState(false);
  const [width, setWidth] = useState(320);

  const fullText =
    excerpt +
    '\n\n' +
    chitChatKicker +
    (protection ? ' Kevin is now under diplomatic immunity.' : '');

  useEffect(() => {
    preparedRef.current = prepareWithSegments(fullText, FONT_SPEC);
  }, [fullText]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const prepared = preparedRef.current;
    if (!canvas || !prepared) return;

    const cssW = width;
    const textLeft = PAD;
    const textRight = cssW - PAD;
    const textTop = PAD;
    const baseWidth = Math.max(120, textRight - textLeft);

    const pw = PIECE_SIZE;
    const ph = PIECE_SIZE;
    const { x: px, y: py } = pieceRef.current;

    const textBottom = textTop + lastHeightRef.current;
    const overlapX = Math.max(0, Math.min(px + pw, textRight) - Math.max(px, textLeft));
    const overlapY = Math.max(0, Math.min(py + ph, textBottom) - Math.max(py, textTop));
    const penalty =
      overlapX > 0 && overlapY > 0 ? Math.min(baseWidth * 0.55, overlapX * 1.15 + 28) : 0;
    const maxWidth = Math.max(130, baseWidth - penalty);

    const { lines, height } = layoutWithLines(prepared, maxWidth, LINE_HEIGHT_MULT);
    lastHeightRef.current = height;

    const cssH = Math.max(260, Math.ceil(textTop + height + PAD + 32), Math.ceil(py + ph + PAD + 12));

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const lineStep = FONT_PX * LINE_HEIGHT_MULT;
    ctx.font = FONT_SPEC;
    ctx.fillStyle = '#1e1a16';
    ctx.textBaseline = 'top';

    let y = textTop;
    for (const line of lines) {
      ctx.fillText(line.text, textLeft, y);
      y += lineStep;
    }

    const pieceX = px;
    const pieceY = py;
    ctx.shadowColor = 'rgba(30, 26, 22, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#faf6ef';
    drawPieceBg(ctx, pieceX, pieceY, pw, ph, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#c9b8a4';
    ctx.lineWidth = 2;
    drawPieceBg(ctx, pieceX, pieceY, pw, ph, 10);
    ctx.stroke();

    ctx.font = `${Math.floor(ph * 0.62)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e1a16';
    ctx.fillText('♘', pieceX + pw / 2, pieceY + ph / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }, [width]);

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
    const hit =
      x >= px && x <= px + PIECE_SIZE && y >= py && y <= py + PIECE_SIZE;
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
    const x = e.clientX - rect.left - dragRef.current.dx;
    const y = e.clientY - rect.top - dragRef.current.dy;
    const maxX = rect.width - PIECE_SIZE;
    const maxY = rect.height - PIECE_SIZE;
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
        <p className="playfield-hint">Motion is reduced on your device — we skipped the draggable demo.</p>
      </div>
    );
  }

  return (
    <div className="playfield-wrap">
      <p className="sr-only">
        {excerpt} {chitChatKicker} {attribution}. Interactive canvas: drag the knight to squish the
        text wrap.
      </p>
      <div ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Draggable knight over reflowing book excerpt"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className="playfield-hint">
        Tip: triple-tap the knight for horse protection mode.{' '}
        <span className="wobble" aria-hidden>
          ♘
        </span>
      </p>
    </div>
  );
}
