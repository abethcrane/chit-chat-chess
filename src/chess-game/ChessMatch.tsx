import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { chooseAiMove, type AiDifficulty } from './ai/search';
import {
  ALL_PIECE_TYPES,
  type Color,
  type GameState,
  type Move,
  type Piece,
  type PieceType,
  type Square,
} from './core/types';
import { fileOf, rankOf, square, toAlgebraic } from './core/types';
import { pieceAt as at } from './core/board';
import { createGame, evaluateOutcome, outcomeAfterMove, tryApplyMove } from './core/game';
import { explainSquare } from './core/explain';
import { getCapturedPiece, legalMovesFrom } from './core/moves';
import { PIECE_HEIGHT_RATIO, pieceImageUrl, pieceTypeTogglePath } from './pieceArt';

const CAPTURE_SORT: PieceType[] = ['Q', 'R', 'B', 'N', 'P'];

function playOut(start: GameState, moves: readonly Move[]): GameState {
  let g = start;
  for (const m of moves) {
    const n = tryApplyMove(g, m);
    if (!n) break;
    g = n;
  }
  return g;
}

function sortCaptured(list: Piece[]): Piece[] {
  return [...list].sort(
    (a, b) => CAPTURE_SORT.indexOf(a.type) - CAPTURE_SORT.indexOf(b.type) || a.type.localeCompare(b.type),
  );
}

const PIECE_TOGGLE_ARIA: Record<PieceType, string> = {
  K: 'King — always on the board',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
  P: 'Pawn',
};

/**
 * Fixed grid: rank 0 at top, rank 7 at bottom (white’s home toward the bottom of the screen).
 * When seated as Black, the whole `.chess-board` is rotated 180° — same mapping, no remapping.
 */
function cellToSquare(file: number, rankFromTop: number): Square {
  return square(file, 7 - rankFromTop);
}

function sideLabel(c: Color): string {
  return c === 'w' ? 'White' : 'Black';
}

/** Current rotateZ in degrees from getComputedStyle, or null if none. */
function readRotateZDeg(el: HTMLElement): number | null {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return null;
  const m = t.match(/^matrix\(([-0-9eE.]+),\s*([-0-9eE.]+),/);
  if (!m) return null;
  const a = Number.parseFloat(m[1]!);
  const b = Number.parseFloat(m[2]!);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  let deg = (Math.atan2(b, a) * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  return deg;
}

function pickMoveForDestination(state: GameState, from: Square, to: Square): Move | null {
  const opts = legalMovesFrom(state, from).filter((m) => m.to === to);
  if (opts.length === 0) return null;
  const q = opts.find((o) => o.promotion === 'Q');
  return q ?? opts[0]!;
}

function isCastleMove(prev: GameState, move: Move): boolean {
  const p = prev.board[move.from];
  if (!p || p.type !== 'K') return false;
  return Math.abs(fileOf(move.to) - fileOf(move.from)) === 2;
}

function isEnPassantMove(prev: GameState, move: Move): boolean {
  const p = prev.board[move.from];
  if (!p || p.type !== 'P') return false;
  return move.to === prev.epSquare && !prev.board[move.to];
}

const SS_CASTLE = 'ccc_taught_castle';
const SS_EP = 'ccc_taught_ep';

const AI_THINKING_LINES = [
  'Calculating a move…',
  'Thinking sooooo hard…',
  'This will only take a moment…',
  'Staring at the squares…',
  'Consulting the 1s and 0s',
] as const;

const AI_DIFFICULTY_ORDER: AiDifficulty[] = ['easy', 'medium', 'hard'];

const AI_DIFFICULTY_LABEL: Record<AiDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export type ChessMatchProps = {
  enabledTypes?: Set<PieceType>;
  onEnabledTypesChange?: (next: Set<PieceType>) => void;
};

export function ChessMatch({ enabledTypes: controlledEnabled, onEnabledTypesChange }: ChessMatchProps = {}) {
  const base = import.meta.env.BASE_URL;
  const [localEnabled, setLocalEnabled] = useState<Set<PieceType>>(() => new Set(ALL_PIECE_TYPES));
  const enabledTypes = controlledEnabled ?? localEnabled;
  const setEnabledTypes = onEnabledTypesChange ?? setLocalEnabled;
  const [vsAi, setVsAi] = useState(false);
  const [humanColor, setHumanColor] = useState<Color>(() => (Math.random() < 0.5 ? 'w' : 'b'));
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
  const [training, setTraining] = useState(true);
  const [rotateBoardToSeat, setRotateBoardToSeat] = useState(false);
  const [start, setStart] = useState<GameState>(() => {
    const s = new Set(ALL_PIECE_TYPES);
    return createGame(s);
  });
  const [moveLog, setMoveLog] = useState<Move[]>([]);
  const startRef = useRef(start);
  startRef.current = start;

  const game = useMemo(() => playOut(start, moveLog), [start, moveLog]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [hoverSq, setHoverSq] = useState<Square | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [hoverExplain, setHoverExplain] = useState<string | null>(null);
  const bannerTimer = useRef<number | null>(null);

  const aiColor: Color = humanColor === 'w' ? 'b' : 'w';
  /** Whose home rank is at the bottom. When rotation is off, fixed white toward the bottom (standard diagram). */
  const boardFacing: Color = rotateBoardToSeat ? (vsAi ? humanColor : game.toMove) : 'w';

  /** Counter-rotate all sprites together after board spin: 0 while spinning to Black, 180 while spinning to White, then snap to upright. */
  const [pieceSpinDeg, setPieceSpinDeg] = useState<0 | 180>(() => (boardFacing === 'b' ? 180 : 0));
  const pieceSpinDegRef = useRef(pieceSpinDeg);
  pieceSpinDegRef.current = pieceSpinDeg;

  const boardFacingAnimRef = useRef<HTMLDivElement>(null);
  const boardAngleRef = useRef(0);
  const isFirstBoardFacingLayoutRef = useRef(true);
  useLayoutEffect(() => {
    const el = boardFacingAnimRef.current;
    if (!el) return;
    const target = boardFacing === 'b' ? 180 : 0;

    if (isFirstBoardFacingLayoutRef.current) {
      isFirstBoardFacingLayoutRef.current = false;
      boardAngleRef.current = target;
      el.style.transform = `rotateZ(${target}deg)`;
      setPieceSpinDeg(boardFacing === 'b' ? 180 : 0);
      return;
    }

    el.getAnimations().forEach((a) => a.cancel());
    const fromComputed = readRotateZDeg(el);
    let prevAngle = fromComputed !== null ? fromComputed : boardAngleRef.current;
    const normDeg = (d: number) => ((d % 360) + 360) % 360;
    const degDist = (a: number, b: number) => {
      const d = Math.abs(normDeg(a) - normDeg(b));
      return Math.min(d, 360 - d);
    };
    // Always play a half-turn on player switch, even if fill:forwards already left us at the target angle.
    if (degDist(prevAngle, target) < 2) {
      prevAngle = target === 180 ? 0 : 180;
    }

    const snapPieces = () => setPieceSpinDeg(boardFacing === 'b' ? 180 : 0);

    const reduced =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      boardAngleRef.current = target;
      el.style.transform = `rotateZ(${target}deg)`;
      snapPieces();
      return;
    }

    const duringAnim = target === 180 ? 0 : 180;
    if (pieceSpinDegRef.current !== duringAnim) {
      flushSync(() => setPieceSpinDeg(duringAnim));
    }
    const anim = el.animate(
      [{ transform: `rotateZ(${prevAngle}deg)` }, { transform: `rotateZ(${target}deg)` }],
      { duration: 380, easing: 'cubic-bezier(0.45, 0.05, 0.25, 1)', fill: 'forwards' },
    );
    anim.onfinish = () => {
      boardAngleRef.current = target;
      snapPieces();
    };
  }, [boardFacing]);

  const outcome = useMemo(() => evaluateOutcome(game), [game]);

  const capturePiles = useMemo(() => {
    const whitePieces: Piece[] = [];
    const blackPieces: Piece[] = [];
    let g = start;
    for (const m of moveLog) {
      const cap = getCapturedPiece(g, m);
      if (cap) {
        if (cap.color === 'w') whitePieces.push(cap);
        else blackPieces.push(cap);
      }
      const n = tryApplyMove(g, m);
      if (!n) break;
      g = n;
    }
    return { whitePieces: sortCaptured(whitePieces), blackPieces: sortCaptured(blackPieces) };
  }, [start, moveLog]);

  const beginNewGame = useCallback(() => {
    const set = new Set(enabledTypes);
    set.add('K');
    try {
      const g = createGame(set);
      setStart(g);
      setMoveLog([]);
      setSelected(null);
      setHoverSq(null);
      setBanner(null);
      setHoverExplain(null);
    } catch {
      setBanner('Need both kings — enable the king for each side.');
    }
  }, [enabledTypes]);

  /** When the piece-type set changes, start a fresh standard position (same color) so the board matches the toggles. */
  const pieceSetSigRef = useRef<string | null>(null);
  useEffect(() => {
    const sig = [...enabledTypes].sort().join('');
    if (pieceSetSigRef.current === null) {
      pieceSetSigRef.current = sig;
      return;
    }
    if (pieceSetSigRef.current === sig) return;
    pieceSetSigRef.current = sig;
    beginNewGame();
  }, [enabledTypes, beginNewGame]);

  const undo = useCallback(() => {
    setMoveLog((log) => {
      if (log.length === 0) return log;
      if (!vsAi) return log.slice(0, -1);
      const st = startRef.current;
      const g = playOut(st, log);
      if (g.toMove === aiColor) return log.slice(0, -1);
      if (log.length >= 2) return log.slice(0, -2);
      return log.slice(0, -1);
    });
    setSelected(null);
    setHoverSq(null);
    setHoverExplain(null);
  }, [vsAi, aiColor]);

  const showBanner = useCallback((msg: string, ms = 3200) => {
    setBanner(msg);
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), ms);
  }, []);

  const toggleType = (t: PieceType) => {
    if (t === 'K') return;
    const prev = enabledTypes;
    const next = new Set(prev);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setEnabledTypes(next);
  };

  const onSquareClick = (sq: Square) => {
    if (outcome.phase !== 'playing') return;
    if (vsAi && game.toMove !== humanColor) return;

    const piece = at(game, sq);
    if (selected === null) {
      if (piece && piece.color === game.toMove) {
        setSelected(sq);
      }
      return;
    }

    if (selected === sq) {
      setSelected(null);
      return;
    }

    const move = pickMoveForDestination(game, selected, sq);
    if (!move) {
      if (piece && piece.color === game.toMove) {
        setSelected(sq);
      }
      return;
    }

    const prev = game;
    const applied = tryApplyMove(prev, move);
    if (!applied) return;

    const oc = outcomeAfterMove(prev, move);

    if (isCastleMove(prev, move) && sessionStorage.getItem(SS_CASTLE) !== '1') {
      sessionStorage.setItem(SS_CASTLE, '1');
      showBanner('Castling — king and rook both move for the first time this game. The king jumps two squares toward the rook.', 5200);
    } else if (isEnPassantMove(prev, move) && sessionStorage.getItem(SS_EP) !== '1') {
      sessionStorage.setItem(SS_EP, '1');
      showBanner('En passant — you capture the pawn that just dashed past, as if it only moved one square.', 5200);
    }

    if (oc.phase === 'playing' && oc.sideInCheck) {
      const checked = oc.sideInCheck;
      showBanner(`${checked === 'w' ? 'White' : 'Black'} is in check.`, 2800);
    }

    setMoveLog((log) => [...log, move]);
    setSelected(null);
    setHoverExplain(null);

    if (oc.phase === 'checkmate') {
      showBanner(`Checkmate — ${oc.winner === 'w' ? 'White' : 'Black'} wins.`, 6000);
    } else if (oc.phase === 'stalemate') {
      showBanner('Stalemate — draw.', 4000);
    } else if (oc.phase === 'draw') {
      showBanner('Draw (fifty-move rule).', 4000);
    }
  };

  useEffect(() => {
    if (!vsAi) return;
    if (game.toMove !== aiColor) return;
    const oc = evaluateOutcome(game);
    if (oc.phase !== 'playing') return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setMoveLog((log) => {
        const st = startRef.current;
        let g = st;
        for (const mv of log) {
          const n = tryApplyMove(g, mv);
          if (!n) return log;
          g = n;
        }
        if (g.toMove !== aiColor) return log;
        const oc2 = evaluateOutcome(g);
        if (oc2.phase !== 'playing') return log;
        const m = chooseAiMove(g, aiColor, aiDifficulty);
        if (!m) return log;
        const next = tryApplyMove(g, m);
        if (!next) return log;

        const ocn = outcomeAfterMove(g, m);
        if (ocn.phase === 'playing' && ocn.sideInCheck) {
          const checked = ocn.sideInCheck;
          window.setTimeout(() => {
            showBanner(`${checked === 'w' ? 'White' : 'Black'} is in check.`, 2800);
          }, 0);
        }
        if (ocn.phase === 'checkmate') {
          window.setTimeout(() => showBanner(`Checkmate — ${ocn.winner === 'w' ? 'White' : 'Black'} wins.`, 6000), 0);
        }
        return [...log, m];
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [game, vsAi, aiColor, aiDifficulty, showBanner]);

  const legalDests = useMemo(() => {
    if (!training || selected === null || outcome.phase !== 'playing') return new Set<Square>();
    if (game.toMove !== humanColor && vsAi) return new Set<Square>();
    return new Set(legalMovesFrom(game, selected).map((m) => m.to));
  }, [training, selected, game, outcome.phase, humanColor, vsAi]);

  useEffect(() => {
    if (!training || selected === null) {
      setHoverExplain(null);
      return;
    }
    const selectedHint =
      'Piece selected. Hover over a highlighted square for details about your legal moves, or hover any other square to see why it’s not a legal move for this piece,.';
    // Keep a line of copy whenever something is selected so the panel height doesn’t jump.
    if (hoverSq === null || hoverSq === selected) {
      setHoverExplain(selectedHint);
      return;
    }
    const ex = explainSquare(game, selected, hoverSq);
    setHoverExplain(ex.text);
  }, [training, selected, hoverSq, game]);

  const aiThinking = vsAi && outcome.phase === 'playing' && game.toMove === aiColor;
  const [thinkingLineIx, setThinkingLineIx] = useState(0);

  useEffect(() => {
    if (!aiThinking) return;
    setThinkingLineIx(Math.floor(Math.random() * AI_THINKING_LINES.length));
    const id = window.setInterval(() => {
      setThinkingLineIx((i) => (i + 1) % AI_THINKING_LINES.length);
    }, 1700);
    return () => window.clearInterval(id);
  }, [aiThinking]);

  const difficultyIndex = AI_DIFFICULTY_ORDER.indexOf(aiDifficulty);

  const turnCallout = useMemo(() => {
    const announcePlaying =
      vsAi && game.toMove === humanColor
        ? `Your move (${sideLabel(humanColor)})`
        : `${sideLabel(game.toMove)} to move`;

    if (aiThinking) {
      return (
        <div
          className="chess-match__turn-callout chess-match__turn-callout--thinking"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Computer: ${AI_THINKING_LINES[thinkingLineIx]}`}
        >
          <span className="chess-match__turn-callout-kicker">Computer</span>
          <span className="chess-match__turn-callout-sep" aria-hidden="true">
            ·
          </span>
          <span className="chess-match__turn-callout-ai">{AI_THINKING_LINES[thinkingLineIx]}</span>
        </div>
      );
    }
    if (outcome.phase === 'playing') {
      if (vsAi && game.toMove === humanColor) {
        const c = humanColor;
        return (
          <div className="chess-match__turn-callout" role="status" aria-live="polite" aria-label={announcePlaying}>
            <span className={`chess-match__turn-callout-side chess-match__turn-callout-side--${c}`}>{sideLabel(c)}</span>
            <span className="chess-match__turn-callout-rest"> — your move</span>
          </div>
        );
      }
      const m = game.toMove;
      return (
        <div className="chess-match__turn-callout" role="status" aria-live="polite" aria-label={announcePlaying}>
          <span className={`chess-match__turn-callout-side chess-match__turn-callout-side--${m}`}>{sideLabel(m)}</span>
          <span className="chess-match__turn-callout-rest"> to move</span>
        </div>
      );
    }
    const end =
      outcome.phase === 'checkmate'
        ? 'Checkmate'
        : outcome.phase === 'stalemate'
          ? 'Stalemate'
          : 'Draw';
    return (
      <div
        className="chess-match__turn-callout chess-match__turn-callout--terminal"
        role="status"
        aria-live="polite"
        aria-label={end}
      >
        <span className="chess-match__turn-callout-terminal">{end}</span>
      </div>
    );
  }, [aiThinking, thinkingLineIx, outcome.phase, vsAi, game.toMove, humanColor]);

  return (
    <div className="chess-match">
      <div className="chess-match__toolbar">
        <div className="chess-match__toggles" aria-label="Pieces on the board">
          {ALL_PIECE_TYPES.map((t) => {
            const on = t === 'K' || enabledTypes.has(t);
            return (
              <label
                key={t}
                className={[
                  'chess-match__piece-toggle',
                  on ? 'chess-match__piece-toggle--on' : 'chess-match__piece-toggle--off',
                  t === 'K' ? 'chess-match__piece-toggle--king' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={t === 'K'}
                  onChange={() => toggleType(t)}
                  aria-label={PIECE_TOGGLE_ARIA[t]}
                />
                <span className="chess-match__piece-toggle-face" aria-hidden="true">
                  <img src={`${base}${pieceTypeTogglePath(t)}`} alt="" width={44} height={44} />
                </span>
                <span className="chess-match__piece-toggle-name">{t === 'K' ? 'King' : t}</span>
              </label>
            );
          })}
        </div>
        <p className="chess-match__toggle-note">
          Tip: turning a piece type on or off starts a <strong>fresh board</strong> (same seat; moves cleared).
        </p>
        <div className="chess-match__toolbar-reset">
          <button type="button" className="chess-match__btn chess-match__btn--ghost" onClick={() => beginNewGame()}>
            Reset board
          </button>
        </div>
        <div className="chess-match__controls">
          <div className="chess-match__control-panel">
            <p className="chess-match__panel-label" id="opponent-label">
              Opponent
            </p>
            <div
              className="chess-match__seg"
              role="group"
              aria-labelledby="opponent-label"
            >
              <button
                type="button"
                className={`chess-match__seg-btn${vsAi ? ' chess-match__seg-btn--active' : ''}`}
                aria-pressed={vsAi}
                onClick={() => setVsAi(true)}
              >
                Vs computer
              </button>
              <button
                type="button"
                className={`chess-match__seg-btn${!vsAi ? ' chess-match__seg-btn--active' : ''}`}
                aria-pressed={!vsAi}
                onClick={() => setVsAi(false)}
              >
                Both sides
              </button>
            </div>
            {vsAi ? (
              <div className="chess-match__panel-fields">
                <div>
                  <p className="chess-match__micro-label" id="seat-label">
                    Your seat
                  </p>
                  <div className="chess-match__seg chess-match__seg--seat" role="group" aria-labelledby="seat-label">
                    <button
                      type="button"
                      className={`chess-match__seg-btn${humanColor === 'w' ? ' chess-match__seg-btn--active' : ''}`}
                      aria-pressed={humanColor === 'w'}
                      onClick={() => setHumanColor('w')}
                    >
                      Light side
                    </button>
                    <button
                      type="button"
                      className={`chess-match__seg-btn${humanColor === 'b' ? ' chess-match__seg-btn--active' : ''}`}
                      aria-pressed={humanColor === 'b'}
                      onClick={() => setHumanColor('b')}
                    >
                      Dark side
                    </button>
                  </div>
                </div>
                <div className="chess-match__slider-block">
                  <label className="chess-match__slider-label" htmlFor="ai-difficulty-slider">
                    <span>Computer strength</span>
                    <span className="chess-match__slider-value">{AI_DIFFICULTY_LABEL[aiDifficulty]}</span>
                  </label>
                  <input
                    id="ai-difficulty-slider"
                    type="range"
                    className="chess-match__diff-slider"
                    min={0}
                    max={2}
                    step={1}
                    value={difficultyIndex}
                    aria-valuemin={0}
                    aria-valuemax={2}
                    aria-valuenow={difficultyIndex}
                    aria-valuetext={AI_DIFFICULTY_LABEL[aiDifficulty]}
                    onChange={(e) =>
                      setAiDifficulty(AI_DIFFICULTY_ORDER[Number(e.target.value)] as AiDifficulty)
                    }
                  />
                  <div className="chess-match__slider-ticks" aria-hidden="true">
                    <span>Easy</span>
                    <span>Medium</span>
                    <span>Hard</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="chess-match__panel-hint">Move for White and Black — hot-seat style.</p>
            )}
          </div>

          <div className="chess-match__control-panel">
            <p className="chess-match__panel-label" id="hints-label">
              Board hints
            </p>
            <div className="chess-match__seg" role="group" aria-labelledby="hints-label">
              <button
                type="button"
                className={`chess-match__seg-btn${training ? ' chess-match__seg-btn--active' : ''}`}
                aria-pressed={training}
                onClick={() => setTraining(true)}
              >
                Coach mode
              </button>
              <button
                type="button"
                className={`chess-match__seg-btn${!training ? ' chess-match__seg-btn--active' : ''}`}
                aria-pressed={!training}
                onClick={() => setTraining(false)}
              >
                Zen
              </button>
            </div>
            <p className="chess-match__panel-hint chess-match__panel-hint--tight">
              {training ? 'Highlights legal moves & hover tips.' : 'No move glow — just the pieces.'}
            </p>
          </div>
        </div>
      </div>

      <div className="chess-match__arena">
        <div className="chess-match__graveyards-angel" aria-hidden="true">
          😇
        </div>

        <div className="chess-match__board-only">
          <div className="chess-match__board-bar">
            <div className="chess-match__board-bar-left">{turnCallout}</div>
            <div className="chess-match__board-bar-right">
              <label className="chess-match__rotate-board" htmlFor="chess-rotate-board">
                <input
                  id="chess-rotate-board"
                  type="checkbox"
                  className="sr-only"
                  checked={rotateBoardToSeat}
                  onChange={(e) => setRotateBoardToSeat(e.target.checked)}
                />
                <span className="chess-match__rotate-board-track" aria-hidden="true" />
                <span className="chess-match__rotate-board-text">Face seat</span>
              </label>
              <button type="button" className="chess-match__btn chess-match__btn--compact" onClick={undo} disabled={moveLog.length === 0}>
                Undo
              </button>
            </div>
          </div>
          <div className="chess-board-perspective">
            <div ref={boardFacingAnimRef} className="chess-board" role="grid" aria-label="Chess board">
              {Array.from({ length: 8 }, (_, rankFromTop) => (
                <div key={rankFromTop} className="chess-board__rank" role="row">
                  {Array.from({ length: 8 }, (_, file) => {
                    const sq = cellToSquare(file, rankFromTop);
                    // FIDE: nearest corner to each player is a light square → h1 & a8 light; a1 & h8 dark.
                    const light = (fileOf(sq) + rankOf(sq)) % 2 === 1;
                    const p = game.board[sq];
                    const isSel = selected === sq;
                    const isLegal = legalDests.has(sq);
                    const isLegalCapture = isLegal && p && p.color !== game.toMove;
                    const isLegalQuiet = isLegal && !isLegalCapture;
                    const isHover = hoverSq === sq;
                    return (
                      <button
                        key={sq}
                        type="button"
                        role="gridcell"
                        aria-label={`${toAlgebraic(sq)}${p ? ` ${p.color} ${p.type}` : ' empty'}`}
                        className={[
                          'chess-board__sq',
                          light ? 'chess-board__sq--light' : 'chess-board__sq--dark',
                          isSel ? 'chess-board__sq--selected' : '',
                          isLegal ? 'chess-board__sq--legal' : '',
                          isLegalQuiet ? 'chess-board__sq--legal-quiet' : '',
                          isLegalCapture ? 'chess-board__sq--legal-capture' : '',
                          isHover ? 'chess-board__sq--hover' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSquareClick(sq)}
                        onMouseEnter={() => setHoverSq(sq)}
                        onMouseLeave={() => setHoverSq(null)}
                      >
                        {p ? (
                          <img
                            className="chess-board__piece"
                            src={pieceImageUrl(base, p, sq)}
                            alt=""
                            style={{
                              ['--ph' as string]: String(PIECE_HEIGHT_RATIO[p.type]),
                              transform: `rotate(${pieceSpinDeg}deg)`,
                              transformOrigin: 'center center',
                            }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chess-match__graveyard-band">
          <aside
            className="chess-match__graveyard chess-match__graveyard--white"
            aria-label="Captured white pieces"
          >
            <span className="chess-match__graveyard-angel" aria-hidden="true">
              😇
            </span>
            <div className="chess-match__grave-pile">
              {capturePiles.whitePieces.map((p, i) => (
                <div
                  key={`w-${i}-${p.type}`}
                  className="chess-match__grave-piece"
                  style={{ ['--ph' as string]: String(PIECE_HEIGHT_RATIO[p.type]) }}
                >
                  <img src={pieceImageUrl(base, p, square(0, 0))} alt="" />
                </div>
              ))}
            </div>
          </aside>

          <aside
            className="chess-match__graveyard chess-match__graveyard--black"
            aria-label="Captured black pieces"
          >
            <span className="chess-match__graveyard-angel" aria-hidden="true">
              😇
            </span>
            <div className="chess-match__grave-pile">
              {capturePiles.blackPieces.map((p, i) => (
                <div
                  key={`b-${i}-${p.type}`}
                  className="chess-match__grave-piece"
                  style={{ ['--ph' as string]: String(PIECE_HEIGHT_RATIO[p.type]) }}
                >
                  <img src={pieceImageUrl(base, p, square(0, 0))} alt="" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {banner || (training && selected !== null) ? (
        <div className="chess-match__foot">
          {banner ? (
            <div className="chess-match__banner chess-match__banner--under-board" role="status">
              {banner}
            </div>
          ) : null}
          {training && selected !== null ? (
            <div className="chess-match__explain-slot">
              <p className="chess-match__explain">{hoverExplain}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
