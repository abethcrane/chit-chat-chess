import { ArtGallery } from './components/ArtGallery';
import { Hero } from './components/Hero';
import { PretextPlayfield } from './components/PretextPlayfield';
import { SiteFooter } from './components/SiteFooter';
import { ValueProps } from './components/ValueProps';

export function App() {
  return (
    <div className="page">
      <Hero />
      <ValueProps />
      <section aria-labelledby="playfield-heading">
        <h2 id="playfield-heading" className="section-title">
          Drag the knight through the literature
        </h2>
        <p className="section-lede">
          Layout is powered by{' '}
          <a href="https://www.pretext.cool/blog/what-is-pretext" target="_blank" rel="noreferrer">
            Pretext
          </a>
          — reflow on the fly, no DOM thrash. (Kevin requests gentleness.)
        </p>
        <PretextPlayfield />
      </section>
      <ArtGallery />
      <section className="cta" aria-labelledby="cta-heading">
        <h2 id="cta-heading">Want in?</h2>
        <p>
          We’re still setting up the table. Check back soon, or nudge your co-organizer for the real
          invite link when it exists.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
