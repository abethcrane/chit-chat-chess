import { Hero } from './components/Hero';
import { PretextPlayfield } from './components/PretextPlayfield';
import { SiteBanner } from './components/SiteBanner';
import { SiteFooter } from './components/SiteFooter';
import { ValueProps } from './components/ValueProps';
import { VibePanel } from './components/VibePanel';

export function App() {
  return (
    <div className="shell">
      <SiteBanner />
      <div className="page page--board">
        <Hero />
        <ValueProps />
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            Help Kevin escape the Very Serious Paragraphs
          </h2>
          <p className="section-lede">
            That wall of words is from an old chess treatise — beautiful, but dense. When it overlaps
            Kevin (yes, the knight has a name), the column narrows: the prose is literally muscling
            for room. Drag him somewhere kinder. Layout uses{' '}
            <a href="https://www.pretext.cool/blog/what-is-pretext" target="_blank" rel="noreferrer">
              Pretext
            </a>{' '}
            so the reflow stays cheap and smooth.
          </p>
          <PretextPlayfield />
        </section>
        <VibePanel />
        <section className="cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Want in?</h2>
          <p>
            We’re still setting up the table. Check back soon, or nudge your co-organizer for the real
            invite link when it exists.
          </p>
        </section>
        <SiteFooter />
      </div>
    </div>
  );
}
