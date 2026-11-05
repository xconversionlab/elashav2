import { useEffect, useState } from 'react';

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Enable only on fine pointer / desktop devices that support hover
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsDesktop(mq.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    mq.addEventListener('change', handleMediaChange);
    return () => mq.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    let rAF = 0;

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
        if (!isVisible) setIsVisible(true);
      });

      // Check if hovering over an interactive element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('a, button, input, select, textarea, [role="button"], .group') !== null)
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rAF);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDesktop, isVisible]);

  if (!isDesktop || !isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[9999] transition-transform duration-75 ease-out select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(${
          isHovered ? 1.4 : 1
        })`,
      }}
    >
      <div className="relative flex items-center justify-center">
        <img
          src="/logo-mark-light.png"
          alt=""
          className={`h-6 w-6 object-contain transition-all duration-200 ${
            isHovered ? 'brightness-125 drop-shadow-[0_0_10px_rgba(212,175,55,0.92)]' : 'opacity-80'
          }`}
          draggable={false}
        />
        {isHovered && (
          <span className="absolute inset-0 -m-1 rounded-full border border-crimson/50 animate-ping opacity-40" />
        )}
      </div>
    </div>
  );
}
