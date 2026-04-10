import { useMemo, useState } from 'react';
import { ALL_PIECE_TYPES, ChessMatch, composeInstructionSections, type PieceType } from './chess-game';
import { Hero } from './components/Hero';
import { HouseRules } from './components/HouseRules';
import { PicnicBar } from './components/PicnicBar';
import { RulesPlayfield } from './components/RulesPlayfield';
import { SiteBanner } from './components/SiteBanner';
import { DancingPieceFrame } from './components/DancingPieceFrame';
import { VibePanel } from './components/VibePanel';

const shellStyle = {
  ['--shell-art' as string]: `url("${import.meta.env.BASE_URL}images/alice-john-tenniel/chessboard-recolorized-w-gemini.png")`,
};

export function App() {
  const [enabledPieceTypes, setEnabledPieceTypes] = useState<Set<PieceType>>(
    () => new Set(ALL_PIECE_TYPES),
  );
  const instructionSections = useMemo(
    () => composeInstructionSections(enabledPieceTypes),
    [enabledPieceTypes],
  );

  return (
    <div className="shell" style={shellStyle}>
      <SiteBanner />
      <DancingPieceFrame className="page page--board">
        <Hero />
        <HouseRules />
        <PicnicBar />
        <section className="panel panel--rose" aria-labelledby="learn-heading">
          <h2 id="learn-heading" className="section-title">
            Let's learn the game!
          </h2>
          <p className="section-lede">
            Toggle which pieces are in play - this will <strong>start a new game </strong> (reset the board).
            </p>
            <p>
              Optional: turn on <strong>Face seat</strong> next to Undo so the board spins toward your color (vs
              computer) or the side to move (both players).
            </p>
          <ChessMatch enabledTypes={enabledPieceTypes} onEnabledTypesChange={setEnabledPieceTypes} />
        </section>
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            How the enabled pieces move
          </h2>
          <RulesPlayfield instructionSections={instructionSections} />
        </section>
        <VibePanel />
        <section className="cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Want in?</h2>
          <p>We’re still setting up the table. Check back soon!</p>
        </section>
      </DancingPieceFrame>
    </div>
  );
}
