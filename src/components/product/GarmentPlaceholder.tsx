import { useId } from 'react';
import { cn } from '@/lib/utils';

interface GarmentPlaceholderProps {
  name: string;
  className?: string;
}

const MOCKUP_PALETTES = [
  { name: 'Washed Onyx', shirt: '#25262b', highlight: '#62636b', shadow: '#08090c', ink: '#e9e5dc', accent: '#d4af37', backdrop: '#15161b' },
  { name: 'Vintage Bone', shirt: '#c9c2b4', highlight: '#f1eadc', shadow: '#777064', ink: '#242329', accent: '#8b2337', backdrop: '#24221f' },
  { name: 'Oxblood Wash', shirt: '#401c27', highlight: '#78404a', shadow: '#160b11', ink: '#f0e7df', accent: '#d8b76b', backdrop: '#1b1016' },
  { name: 'Weathered Olive', shirt: '#414840', highlight: '#737d6d', shadow: '#171c18', ink: '#e8e5d9', accent: '#c1a56a', backdrop: '#171b18' },
  { name: 'Storm Slate', shirt: '#3d4651', highlight: '#77818e', shadow: '#11151b', ink: '#f1eee8', accent: '#bda978', backdrop: '#141920' },
];

const ARTWORK_VARIANTS = [
  { code: 'I', title: 'AFTER DARK' },
  { code: 'II', title: 'NOCTURNE' },
  { code: 'III', title: 'UNBOUND' },
  { code: 'IV', title: 'THE UNKNOWN' },
];

export function GarmentPlaceholder({ name, className }: GarmentPlaceholderProps) {
  const generatedId = useId().replace(/:/g, '');
  const signature = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  const palette = MOCKUP_PALETTES[signature % MOCKUP_PALETTES.length];
  const artwork = ARTWORK_VARIANTS[signature % ARTWORK_VARIANTS.length];
  const textureId = `fabric-texture-${generatedId}`;
  const shirtGradientId = `shirt-gradient-${generatedId}`;
  const highlightId = `shirt-highlight-${generatedId}`;
  const printGradientId = `print-gradient-${generatedId}`;
  const shirtClipId = `shirt-clip-${generatedId}`;

  return (
    <div
      className={cn(
        'garment-placeholder absolute inset-0 isolate flex flex-col items-center justify-between overflow-hidden px-4 py-5 sm:px-6 sm:py-6',
        className
      )}
      role="img"
      aria-label={`Concept T-shirt mockup for ${name}. Move your mouse over it to tilt the shirt in 3D. Original product photography has not been added.`}
      onPointerMove={event => {
        if (event.pointerType !== 'mouse') return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;

        const horizontal = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
        const vertical = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));

        event.currentTarget.style.setProperty('--tilt-x', `${-vertical * 13}deg`);
        event.currentTarget.style.setProperty('--tilt-y', `${horizontal * 18}deg`);
        event.currentTarget.style.setProperty('--pointer-x', `${(horizontal + 1) * 50}%`);
        event.currentTarget.style.setProperty('--pointer-y', `${(vertical + 1) * 50}%`);
        event.currentTarget.style.setProperty('--tilt-duration', '95ms');
      }}
      onPointerLeave={event => {
        event.currentTarget.style.setProperty('--tilt-x', '0deg');
        event.currentTarget.style.setProperty('--tilt-y', '0deg');
        event.currentTarget.style.setProperty('--pointer-x', '50%');
        event.currentTarget.style.setProperty('--pointer-y', '50%');
        event.currentTarget.style.setProperty('--tilt-duration', '620ms');
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 34%, ${palette.highlight}2b 0%, transparent 52%), linear-gradient(145deg, ${palette.backdrop}, #08090b 86%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-3 border border-white/[0.08] sm:inset-4" />
      <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent sm:inset-x-4" />
      <div className="pointer-events-none absolute -left-16 top-1/4 h-40 w-40 rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-52 w-52 rounded-full border border-white/[0.035]" />

      <div className="relative z-10 flex w-full items-center justify-between gap-3 text-[7px] font-semibold uppercase tracking-[0.28em] text-white/50 sm:text-[8px]">
        <span>ELASHA / STUDIO OBJECTS</span>
        <span className="text-[#d4af37]/80">No. {String((signature % 89) + 10)}</span>
      </div>

      <div className="garment-placeholder__stage relative z-10 flex min-h-0 w-full flex-1 items-center justify-center py-2">
        <svg
          viewBox="0 0 480 560"
          aria-hidden="true"
          className="garment-placeholder__shirt h-full w-full max-w-[390px] overflow-visible"
        >
          <defs>
            <linearGradient id={shirtGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={palette.highlight} />
              <stop offset="28%" stopColor={palette.shirt} />
              <stop offset="74%" stopColor={palette.shirt} />
              <stop offset="100%" stopColor={palette.shadow} />
            </linearGradient>
            <linearGradient id={highlightId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fff" stopOpacity=".02" />
              <stop offset="48%" stopColor="#fff" stopOpacity=".16" />
              <stop offset="100%" stopColor="#fff" stopOpacity=".015" />
            </linearGradient>
            <linearGradient id={printGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={palette.ink} />
              <stop offset="100%" stopColor={palette.accent} />
            </linearGradient>
            <filter id={textureId} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" seed={signature % 13} />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="table" tableValues="0 .12" />
              </feComponentTransfer>
              <feBlend in="SourceGraphic" mode="soft-light" />
            </filter>
            <clipPath id={shirtClipId}>
              <path d="M170 72 L128 88 L56 157 L101 224 L143 190 L143 472 Q143 492 162 492 H318 Q337 492 337 472 V190 L379 224 L424 157 L352 88 L310 72 Q286 108 240 108 Q194 108 170 72Z" />
            </clipPath>
          </defs>

          <ellipse cx="240" cy="510" rx="145" ry="17" fill="#000" opacity=".48" />
          <ellipse cx="240" cy="505" rx="102" ry="8" fill={palette.accent} opacity=".1" />

          <g filter={`url(#${textureId})`}>
            <path
              d="M170 72 L128 88 L56 157 L101 224 L143 190 L143 472 Q143 492 162 492 H318 Q337 492 337 472 V190 L379 224 L424 157 L352 88 L310 72 Q286 108 240 108 Q194 108 170 72Z"
              fill={`url(#${shirtGradientId})`}
              stroke={palette.highlight}
              strokeOpacity=".56"
              strokeWidth="2"
            />
            <g clipPath={`url(#${shirtClipId})`}>
              <path d="M80 160 154 205 145 470 82 485Z" fill="#000" opacity=".1" />
              <path d="M400 160 326 205 335 470 398 485Z" fill="#000" opacity=".14" />
              <path d="M150 110 Q172 250 165 470" stroke="#fff" strokeOpacity=".09" strokeWidth="23" fill="none" />
              <path d="M330 110 Q308 250 315 470" stroke="#000" strokeOpacity=".16" strokeWidth="28" fill="none" />
              <path d="M170 120 Q240 152 310 120 L325 480 H155Z" fill={`url(#${highlightId})`} opacity=".45" />
              <path d="M145 188 Q155 260 148 452 M335 188 Q325 260 332 452" stroke="#fff" strokeOpacity=".13" strokeWidth="2" fill="none" />
              <path d="M146 463 Q240 474 334 463" stroke="#fff" strokeOpacity=".16" strokeWidth="2" fill="none" />
              <path d="M148 469 Q240 480 332 469" stroke="#000" strokeOpacity=".2" strokeWidth="2" fill="none" />
              <path d="M75 167 100 205 M405 167 380 205" stroke="#fff" strokeOpacity=".13" strokeWidth="2" fill="none" />
              <path d="M128 95 148 114 M352 95 332 114" stroke="#fff" strokeOpacity=".13" strokeWidth="2" fill="none" />
              <path d="M170 72 Q194 108 240 108 Q286 108 310 72" stroke="#fff" strokeOpacity=".18" strokeWidth="3" fill="none" />
              <path d="M194 79 Q205 127 240 129 Q275 127 286 79" fill={palette.shadow} opacity=".72" />
              <path d="M198 82 Q210 119 240 121 Q270 119 282 82" stroke={palette.highlight} strokeOpacity=".7" strokeWidth="4" fill="none" />
              <path d="M204 87 Q215 115 240 116 Q265 115 276 87" stroke="#fff" strokeOpacity=".1" strokeWidth="1.5" fill="none" />
            </g>
          </g>

          <path d="M128 88 56 157 101 224 143 190 M352 88 424 157 379 224 337 190" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1.5" />
          <path d="M143 188 159 202 M337 188 321 202" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1.5" />

          <g transform="translate(240 290)" fill="none" stroke={`url(#${printGradientId})`}>
            {signature % 4 === 0 ? (
              <>
                <path d="M0 -75 C-38 -45 -59 -20 -73 10 C-47 4 -27 18 0 42 C27 18 47 4 73 10 C59 -20 38 -45 0 -75Z" strokeWidth="2.5" />
                <path d="M0 -62 C-16 -25 -16 14 0 55 C16 14 16 -25 0 -62Z" strokeWidth="1.8" />
                <path d="M-65 9 Q-34 -3 0 25 Q34 -3 65 9 M-50 24 Q-26 19 0 49 Q26 19 50 24" strokeWidth="1.5" />
                <circle cx="0" cy="-4" r="15" strokeWidth="1.8" />
              </>
            ) : signature % 4 === 1 ? (
              <>
                <circle cx="0" cy="0" r="57" strokeWidth="2" />
                <circle cx="0" cy="0" r="43" strokeWidth="1" strokeDasharray="2 5" />
                <path d="M0 -70 12 -18 62 -42 23 -4 70 14 17 19 37 66 0 31 -37 66 -17 19 -70 14 -23 -4 -62 -42 -12 -18Z" strokeWidth="1.7" />
                <circle cx="0" cy="0" r="9" strokeWidth="2" />
              </>
            ) : signature % 4 === 2 ? (
              <>
                <path d="M-3 70 C-52 44 -58 8 -28 -27 C-27 2 -7 8 2 -11 C16 -38 4 -59 29 -78 C27 -35 71 -18 57 25 C49 54 22 68 -3 70Z" strokeWidth="2.2" />
                <path d="M0 45 C-19 20 7 5 16 -18 C37 15 33 32 0 45Z" strokeWidth="1.7" />
                <path d="M-52 58 Q0 82 52 58" strokeWidth="1.5" />
              </>
            ) : (
              <>
                <circle cx="0" cy="0" r="60" strokeWidth="1.7" />
                <path d="M20 -55 A60 60 0 1 0 20 55 A43 43 0 1 1 20 -55Z" strokeWidth="2" />
                <path d="M-68 -5h136 M0 -73v146 M-49 -49l98 98 M49 -49l-98 98" strokeWidth="1" strokeDasharray="3 6" />
                <circle cx="0" cy="0" r="11" strokeWidth="2" />
              </>
            )}
          </g>

          <g fill={`url(#${printGradientId})`} textAnchor="middle">
            <text x="240" y="385" fontFamily="'Metal Mania', serif" fontSize="28" letterSpacing="3">{artwork.title}</text>
            <text x="240" y="405" fontFamily="Inter, sans-serif" fontSize="7" letterSpacing="3" opacity=".8">ELASHA · ARTWEAR STUDIO</text>
          </g>
        </svg>
      </div>

      <div className="relative z-10 flex w-full items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[7px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]/85 sm:text-[8px]">
            {palette.name} / Oversized silhouette
          </p>
          <p className="mt-1 truncate font-display text-sm uppercase tracking-[0.08em] text-white/90 sm:text-base">
            {name}
          </p>
          <p className="mt-1 text-[7px] uppercase tracking-[0.2em] text-white/40 sm:text-[8px]">
            Move cursor to rotate · Concept mockup
          </p>
        </div>
        <span className="shrink-0 border border-white/15 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.18em] text-white/55">
          {artwork.code} / 04
        </span>
      </div>
    </div>
  );
}
