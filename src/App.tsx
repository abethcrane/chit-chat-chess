import { useMemo, useState } from 'react';
import {
  ALL_PIECE_TYPES,
  ChessMatch,
  composeInstructionText,
  type PieceType,
} from './chess-game';
import { Hero } from './components/Hero';
import { HouseRules } from './components/HouseRules';
import { PicnicBar } from './components/PicnicBar';
import { PretextPlayfield } from './components/PretextPlayfield.tsx';
import { SiteBanner } from './components/SiteBanner';
import { SiteFooter } from './components/SiteFooter.tsx';
import { VibePanel } from './components/VibePanel';

const shellStyle = {
  ['--shell-art' as string]: `url("${import.meta.env.BASE_URL}images/2book11.jpg")`,
};

export function App() {
  const [enabledPieceTypes, setEnabledPieceTypes] = useState<Set<PieceType>>(
    () => new Set(ALL_PIECE_TYPES),
  );
  const instructionText = useMemo(
    () => composeInstructionText(enabledPieceTypes),
    [enabledPieceTypes],
  );

  return (
    <div className="shell" style={shellStyle}>
      <SiteBanner />
      <div className="page page--board">
        <Hero />
        <PicnicBar />
        <HouseRules />
        <section className="panel panel--rose" aria-labelledby="learn-heading">
          <h2 id="learn-heading" className="section-title">
            Learn the pieces, then play
          </h2>
          <p className="section-lede">
            Toggle which pieces appear on the board, flip a color for each new game against the AI, and use training
            mode to see glowing legal squares and hover reasons.
          </p>
          <ChessMatch enabledTypes={enabledPieceTypes} onEnabledTypesChange={setEnabledPieceTypes} />
        </section>
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            How the pieces move
          </h2>
          <p className="section-lede">
            The prose below matches the pieces you enabled above. Drag through real legal moves and watch the text flow
            around your piece.
          </p>
          <PretextPlayfield instructionText={instructionText} enabledPieceTypes={enabledPieceTypes} />
        </section>
        <VibePanel />
        <section className="cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Want in?</h2>
          <p>We’re still setting up the table. Check back soon!</p>
        </section>
        <SiteFooter />
      </div>
    </div>
  );
}
