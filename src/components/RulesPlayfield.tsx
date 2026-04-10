import { useEffect, useMemo, useRef, useState } from 'react';
import { type InstructionSection, type PieceType } from '../chess-game';
import { attribution } from '../content/chessFlourish';

const PIECE_TARGET_W = 72;

type PieceKind = 'knightWhite' | 'bishop' | 'king' | 'queen' | 'rook' | 'pawn';

export type RulesPlayfieldProps = {
  instructionSections: InstructionSection[];
  enabledPieceTypes: ReadonlySet<PieceType>;
};

type DockDef = { kind: PieceKind; label: string; path: string; pieceType: PieceType };

const DOCK_ITEMS: DockDef[] = [
  { kind: 'knightWhite', label: 'Knight (Kevin)', path: 'images/pieces/white-knight1.png', pieceType: 'N' },
  { kind: 'bishop', label: 'Bishop', path: 'images/pieces/white-bishop.png', pieceType: 'B' },
  { kind: 'king', label: 'King', path: 'images/pieces/white-king.png', pieceType: 'K' },
  { kind: 'queen', label: 'Queen', path: 'images/pieces/white-queen.png', pieceType: 'Q' },
  { kind: 'rook', label: 'Rook', path: 'images/pieces/white-rook.png', pieceType: 'R' },
  { kind: 'pawn', label: 'Pawn', path: 'images/pieces/white-pawn.png', pieceType: 'P' },
];

function pieceTypeForKind(kind: PieceKind): PieceType {
  if (kind === 'knightWhite') return 'N';
  if (kind === 'bishop') return 'B';
  if (kind === 'king') return 'K';
  if (kind === 'queen') return 'Q';
  if (kind === 'rook') return 'R';
  return 'P';
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

function InstructionBody({ sections }: { sections: InstructionSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="instruction-sheet__empty">Enable at least one piece type above to see how it moves.</p>
    );
  }
  return (
    <>
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
    </>
  );
}

export function RulesPlayfield({ instructionSections, enabledPieceTypes }: RulesPlayfieldProps) {
  const reducedMotion = usePrefersReducedMotion();
  const baseUrl = import.meta.env.BASE_URL;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePiece, setActivePiece] = useState<PieceKind>('knightWhite');
  const [pieceDims, setPieceDims] = useState({ w: PIECE_TARGET_W, h: PIECE_TARGET_W });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quip, setQuip] = useState<string | null>(null);
  const quipTimerRef = useRef<number | null>(null);

  const activePath = useMemo(() => {
    const d = DOCK_ITEMS.find((x) => x.kind === activePiece)!;
    return d.path;
  }, [activePiece]);
  const pieceSrc = `${baseUrl}${activePath}`;

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

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [activePiece]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth) return;
    const ar = img.naturalWidth / img.naturalHeight || 1;
    const pw = PIECE_TARGET_W;
    const ph = Math.max(40, Math.round(pw / ar));
    setPieceDims({ w: pw, h: ph });
  };

  const clampOffset = (x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const pad = 8;
    const maxX = Math.max(0, el.clientWidth - pieceDims.w - pad);
    const maxY = Math.max(0, el.clientHeight - pieceDims.h - pad);
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  };

  const onPointerDownFloater = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };

    const say = (() => {
      switch (activePiece) {
        case 'knightWhite':
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
    if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => setQuip(null), 1400);
  };

  const onPointerMoveFloater = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(
      clampOffset(d.ox + (e.clientX - d.startX), d.oy + (e.clientY - d.startY)),
    );
  };

  const onPointerUpFloater = (e: React.PointerEvent) => {
    dragRef.current = null;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const visibleDock = DOCK_ITEMS.filter((d) => enabledPieceTypes.has(d.pieceType));

  const shapeStyle: React.CSSProperties = {
    float: 'left',
    width: pieceDims.w,
    height: pieceDims.h,
    marginLeft: offset.x,
    marginTop: offset.y,
    marginRight: 14,
    marginBottom: 8,
    shapeOutside: `url("${pieceSrc}")`,
    shapeImageThreshold: 0.32,
    touchAction: 'none',
    ...( { WebkitShapeOutside: `url("${pieceSrc}")` } as React.CSSProperties),
  };

  if (reducedMotion) {
    return (
      <div className="playfield-wrap">
        <p className="sr-only">{plainSr}</p>
        <div className="instruction-sheet instruction-sheet--solo">
          <InstructionBody sections={instructionSections} />
        </div>
        <p className="playfield-hint">Motion is reduced — draggable piece demo skipped.</p>
      </div>
    );
  }

  return (
    <div className="playfield-wrap">
      <div ref={containerRef} className="rules-playfield">
        <div
          key={activePiece}
          className={`rules-playfield__floater ${isDragging ? 'is-dragging' : ''}`}
          style={shapeStyle}
          onPointerDown={onPointerDownFloater}
          onPointerMove={onPointerMoveFloater}
          onPointerUp={onPointerUpFloater}
          onPointerCancel={onPointerUpFloater}
          role="img"
          aria-label="Draggable piece; drag to reflow the rules text around it"
        >
          <img
            src={pieceSrc}
            alt=""
            width={pieceDims.w}
            height={pieceDims.h}
            className="rules-playfield__piece-img"
            onLoad={onImgLoad}
            draggable={false}
          />
        </div>
        <InstructionBody sections={instructionSections} />
        <div className="rules-playfield__clear" aria-hidden="true" />
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
    </div>
  );
}
