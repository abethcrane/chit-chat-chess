import { Hero } from './components/Hero';
import { PretextPlayfield } from './components/PretextPlayfield';
import { SiteBanner } from './components/SiteBanner';
import { SiteFooter } from './components/SiteFooter';
import { ValueProps } from './components/ValueProps';
import { VibePanel } from './components/VibePanel';

const shellStyle = {
  ['--shell-art' as string]: `url("${import.meta.env.BASE_URL}images/2book11.jpg")`,
};

export function App() {
  return (
    <div className="shell" style={shellStyle}>
      <SiteBanner />
      <div className="page page--board">
        <Hero />
        <ValueProps />
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            Help Kevin escape the Very Serious Paragraphs
          </h2>
          <p className="section-lede">
            That wall of words is from an old chess treatise — beautiful, but dense. Drag Kevin: lines
            split left and right of him so he’s not painted over.{' '}
            <a href="https://www.pretext.cool/blog/what-is-pretext" target="_blank" rel="noreferrer">
              Pretext
            </a>{' '}
            makes that reflow cheap frame-to-frame.
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
