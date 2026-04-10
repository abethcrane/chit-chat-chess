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
  return (
    <div className="shell" style={shellStyle}>
      <SiteBanner />
      <div className="page page--board">
        <Hero />
        <PicnicBar />
        <HouseRules />
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            Help Kevin escape the Very Serious Paragraphs
          </h2>
          <p className="section-lede">
            That wall of words is from an old chess treatise — beautiful, but dense. Let's mix it up.
          </p>
          <PretextPlayfield/>
        </section>
        <VibePanel />
        <section className="cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Want in?</h2>
          <p>
            We’re still setting up the table. Check back soon!
          </p>
        </section>
        <SiteFooter />
      </div>
    </div>
  );
}
