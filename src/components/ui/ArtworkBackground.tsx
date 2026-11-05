import { useEffect, useState } from 'react';

const ARTWORK_BACKGROUNDS = [
  '/artwork/IMG-20261008-WA0015.jpg',
  '/artwork/IMG-20261008-WA0076.jpg',
  '/artwork/IMG-20261008-WA0079.jpg',
  '/artwork/IMG-20261008-WA0081.jpg',
  '/artwork/IMG-20261008-WA0082.jpg',
  '/artwork/IMG-20261008-WA0084.jpg',
  '/artwork/IMG-20261008-WA0085.jpg',
  '/artwork/IMG-20261008-WA0088.jpg',
  '/artwork/IMG-20261008-WA0089.jpg',
] as const;

const CHANGE_INTERVAL_MS = 6_000;

export function ArtworkBackground() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % ARTWORK_BACKGROUNDS.length);
    }, CHANGE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="artwork-background pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050505]" aria-hidden="true">
      {ARTWORK_BACKGROUNDS.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="eager"
          decoding="async"
          className={`artwork-background__image absolute inset-0 h-full w-full select-none object-cover object-center ${index === activeIndex ? 'is-active' : ''}`}
        />
      ))}

      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,4,2,0.14),rgba(5,4,2,0.58))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.24),rgba(5,4,2,0.42))]" />
    </div>
  );
}
