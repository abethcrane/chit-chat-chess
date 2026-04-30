import { useCallback, useRef, useState } from 'react';

const ALICE_DIR = 'alice-john-tenniel';
const ALICE_COLOR = `${ALICE_DIR}/alice-awake-queens-color.png`;
const ALICE_BW = `${ALICE_DIR}/alice-sleeping-queens-bw.png`;

export function SiteBanner() {
  const base = import.meta.env.BASE_URL;
  const colorSrc = `${base}images/${ALICE_COLOR}`;
  const bwSrc = `${base}images/${ALICE_BW}`;

  const [tapped, setTapped] = useState(false);
  const isTouchRef = useRef(false);

  const onTouchStart = useCallback(() => {
    isTouchRef.current = true;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTapped((t) => !t);
  }, []);

  const onClick = useCallback(() => {
    if (isTouchRef.current) {
      isTouchRef.current = false;
      return;
    }
  }, []);

  return (
    <div className="site-banner">
      <div
        className={`site-banner__hit${tapped ? ' site-banner__hit--tapped' : ''}`}
        tabIndex={0}
        role="img"
        aria-label="Alice with the Red and White Queens — hover or tap to see the sleeping woodcut version"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={onClick}
      >
        <div className="site-banner__stage">
          {/* In-flow sizer: hit target matches drawn art, not full viewport width */}
          <img className="site-banner__sizer" src={colorSrc} alt="" aria-hidden draggable={false} />
          <img
            className="site-banner__layer site-banner__layer--bw"
            src={bwSrc}
            alt=""
            decoding="async"
            loading="eager"
            draggable={false}
          />
          <img
            className="site-banner__layer site-banner__layer--color"
            src={colorSrc}
            alt=""
            decoding="async"
            fetchPriority="high"
            loading="eager"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
