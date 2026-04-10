import { useMemo, useState } from 'react';
import {
  ALL_PIECE_TYPES,
  ChessMatch,
  composeInstructionSections,
  PRETEXT_CANVAS_CAPTION,
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
  const instructionSections = useMemo(
    () => composeInstructionSections(enabledPieceTypes),
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
            Toggle which pieces are in play, use <strong>Undo</strong> to step back, and <strong>New game</strong> to
            reset without changing your color. Training mode highlights legal moves and explains hovers. The board
            turns so you’re always at the bottom.
          </p>
          <ChessMatch enabledTypes={enabledPieceTypes} onEnabledTypesChange={setEnabledPieceTypes} />
        </section>
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            How the pieces move
          </h2>
          <p className="section-lede">
            Rules update when you change the toggles. Below, drag a piece freely through the short caption — the text
            reflows around it.
          </p>
          <PretextPlayfield
            canvasCaption={PRETEXT_CANVAS_CAPTION}
            instructionSections={instructionSections}
            enabledPieceTypes={enabledPieceTypes}
          />
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
