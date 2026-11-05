import { useState, useRef, useCallback, useEffect } from 'react';
import { useGarments, useSizesAndColours } from '@/hooks/useCatalog';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadArtwork } from '@/lib/artwork';
import { Button } from '@/components/ui/Button';
import { formatPrice, cn } from '@/lib/utils';
import { Upload, ShoppingCart, RotateCw, ZoomIn, ZoomOut, Move, Check, RotateCcw, Maximize2 } from 'lucide-react';
import type { DesignTransform } from '@/types';
import { Reveal } from '@/components/motion/Reveal';


type ArtworkSide = 'front' | 'back';

const CUSTOM_TSHIRT_STYLES: { slug: string; name: string; frontFile: string; backFile?: string }[] = [
  { slug: 'tank-top', name: 'Tank Top', frontFile: '/custom-tshirts/Tank-front.webp', backFile: '/custom-tshirts/Tank-back.webp' },
  { slug: 'crop-top', name: 'Crop Top', frontFile: '/custom-tshirts/Crop-top.webp' },
  { slug: 'acid-wash', name: 'Acid Wash T-Shirt', frontFile: '/custom-tshirts/Acid-front.webp', backFile: '/custom-tshirts/Acid-back.webp' },
  { slug: 'beige-tee', name: 'Beige T-Shirt', frontFile: '/custom-tshirts/Beige-front.webp', backFile: '/custom-tshirts/Beige-back.webp' },
  { slug: 'oversized-tee', name: 'Oversized T-Shirt', frontFile: '/custom-tshirts/Oversized-front.webp', backFile: '/custom-tshirts/Oversized-back.webp' },
];

export function CustomDesignPage() {
  const { garments, loading: garmentsLoading } = useGarments();
  const { sizes, loading: refLoading } = useSizesAndColours();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [selectedStyleSlug, setSelectedStyleSlug] = useState<string>('oversized-tee');
  const [size, setSize] = useState<string>('');
  const [activeSide, setActiveSide] = useState<ArtworkSide>('front');
  const [frontArtworkUrl, setFrontArtworkUrl] = useState<string | null>(null);
  const [frontArtworkName, setFrontArtworkName] = useState('');
  const [backArtworkUrl, setBackArtworkUrl] = useState<string | null>(null);
  const [backArtworkName, setBackArtworkName] = useState('');
  const [frontTransform, setFrontTransform] = useState<DesignTransform>({ x: 0.5, y: 0.4, scale: 1, rotation: 0 });
  const [backTransform, setBackTransform] = useState<DesignTransform>({ x: 0.5, y: 0.4, scale: 1, rotation: 0 });
  const [uploading, setUploading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transform = activeSide === 'front' ? frontTransform : backTransform;
  const setTransform = useCallback((updater: React.SetStateAction<DesignTransform>) => {
    const applyUpdater = (current: DesignTransform) => typeof updater === 'function' ? updater(current) : updater;
    if (activeSide === 'front') setFrontTransform(applyUpdater);
    else setBackTransform(applyUpdater);
  }, [activeSide]);

  const activeArtworkUrl = activeSide === 'front' ? frontArtworkUrl : backArtworkUrl;
  const activeArtworkName = activeSide === 'front' ? frontArtworkName : backArtworkName;
  const canvasRef = useRef<HTMLDivElement>(null);
  const artworkBoxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const selectedStyle = CUSTOM_TSHIRT_STYLES.find(style => style.slug === selectedStyleSlug) ?? CUSTOM_TSHIRT_STYLES[0];
  const stylePreviewImage = activeSide === 'front'
    ? selectedStyle.frontFile
    : (selectedStyle.backFile ?? selectedStyle.frontFile);
  const garment = garments.find(item => item.slug === selectedStyle.slug) ?? null;
  const selectedTShirtName = selectedStyle.name;

  useEffect(() => {
    if (sizes.length > 0 && !size) setSize(sizes[1]?.label ?? sizes[0].label);
  }, [sizes, size]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!user) {
        setError('Please log in to upload artwork.');
        return;
      }
      setUploading(true);
      setError(null);
      try {
        const result = await uploadArtwork(file, user.id);
        if (activeSide === 'front') {
          setFrontArtworkUrl(result.url);
          setFrontArtworkName(result.name);
        } else {
          setBackArtworkUrl(result.url);
          setBackArtworkName(result.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try a PNG or JPG file.');
      } finally {
        setUploading(false);
      }
    },
    [user, activeSide]
  );

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  const [interactionMode, setInteractionMode] = useState<'idle' | 'drag' | 'resize'>('idle');
  const interactionStartRef = useRef<{
    mode: 'drag' | 'resize';
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    startScale: number;
    centerX: number;
    centerY: number;
  }>({ mode: 'drag', startX: 0, startY: 0, startTx: 0, startTy: 0, startScale: 1, centerX: 0, centerY: 0 });
  const pinchStartRef = useRef<{ dist: number; scale: number }>({ dist: 0, scale: 1 });

  function handleArtworkPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeArtworkUrl) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture not supported
    }
    interactionStartRef.current = {
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      startTx: transform.x,
      startTy: transform.y,
      startScale: transform.scale,
      centerX: 0,
      centerY: 0,
    };
    setInteractionMode('drag');
  }

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeArtworkUrl) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture not supported
    }
    const boxRect = artworkBoxRef.current?.getBoundingClientRect();
    const centerX = boxRect ? boxRect.left + boxRect.width / 2 : e.clientX;
    const centerY = boxRect ? boxRect.top + boxRect.height / 2 : e.clientY;
    interactionStartRef.current = {
      mode: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      startTx: transform.x,
      startTy: transform.y,
      startScale: transform.scale,
      centerX,
      centerY,
    };
    setInteractionMode('resize');
  }

  useEffect(() => {
    if (interactionMode === 'idle') return;

    function handlePointerMove(e: PointerEvent) {
      const state = interactionStartRef.current;
      if (state.mode === 'drag') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dx = (e.clientX - state.startX) / rect.width;
        const dy = (e.clientY - state.startY) / rect.height;
        setTransform(previous => ({
          ...previous,
          x: Math.max(0, Math.min(1, Number((state.startTx + dx).toFixed(3)))),
          y: Math.max(0, Math.min(1, Number((state.startTy + dy).toFixed(3)))),
        }));
      } else if (state.mode === 'resize') {
        const currentDist = Math.hypot(e.clientX - state.centerX, e.clientY - state.centerY);
        const startDist = Math.hypot(state.startX - state.centerX, state.startY - state.centerY);
        if (startDist > 4) {
          const ratio = currentDist / startDist;
          const newScale = Math.min(2.4, Math.max(0.2, Number((state.startScale * ratio).toFixed(2))));
          setTransform(previous => ({
            ...previous,
            scale: newScale,
          }));
        }
      }
    }

    function handlePointerUp() {
      setInteractionMode('idle');
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [interactionMode, setTransform]);

  // Touch pinch-to-zoom gesture handling
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const p1 = e.touches[0];
      const p2 = e.touches[1];
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      pinchStartRef.current = { dist, scale: transform.scale };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartRef.current.dist > 5) {
      e.preventDefault();
      const p1 = e.touches[0];
      const p2 = e.touches[1];
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const ratio = dist / pinchStartRef.current.dist;
      const newScale = Math.min(2.4, Math.max(0.2, Number((pinchStartRef.current.scale * ratio).toFixed(2))));
      setTransform(previous => ({ ...previous, scale: newScale }));
    }
  }

  function handleTouchEnd() {
    pinchStartRef.current.dist = 0;
  }

  async function handleAddToCart() {
    const primaryArtworkUrl = frontArtworkUrl || backArtworkUrl;
    const primaryArtworkName = frontArtworkName || backArtworkName || '';
    if (!garment || !primaryArtworkUrl) {
      setError('Please select a T-shirt and upload artwork for the front or back.');
      return;
    }
    if (!size) {
      setError('Please select a size before continuing.');
      return;
    }
    if (!user) {
      setError('Please log in to save your design.');
      return;
    }

    const cartItemId = 'custom-' + Date.now();
    let customDesignId: string | undefined;

    try {
      const { data, error: designError } = await supabase
        .from('custom_designs')
        .insert({
          user_id: user.id,
          garment_id: garment.id,
          garment_name: selectedTShirtName,
          colour_name: null,
          size_label: size,
          artwork_url: primaryArtworkUrl,
          artwork_name: primaryArtworkName,
          front_artwork_url: frontArtworkUrl,
          back_artwork_url: backArtworkUrl,
          transform: { front: frontTransform, back: backTransform },
          status: 'pending',
          price: garment.base_price,
        })
        .select()
        .single();
      if (designError) throw designError;
      customDesignId = (data as { id: string })?.id;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your design could not be saved yet. Please try again.');
      return;
    }

    addItem({
      id: cartItemId,
      product_id: garment.id,
      product_name: 'Custom ' + selectedTShirtName,
      product_slug: garment.slug,
      product_image: selectedStyle.frontFile,
      variant_id: cartItemId,
      size_label: size,
      colour_name: '',
      colour_hex: '',
      price: garment.base_price,
      quantity: 1,
      is_custom: true,
      custom_design_id: customDesignId,
      artwork_url: primaryArtworkUrl,
    });
    setAdded(true);
    setError(null);
    setTimeout(() => setAdded(false), 3000);
  }

  if (garmentsLoading || refLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="skeleton h-12 w-2/3 max-w-lg" />
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="skeleton aspect-square w-full" />
          <div className="space-y-6">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { n: '01', label: 'T-Shirt Style', done: !!garment },
    { n: '02', label: 'Size', done: !!size },
    { n: '03', label: 'Artwork', done: !!(frontArtworkUrl || backArtworkUrl) },
  ];

  return (
    <div className="bg-dark min-h-screen text-bone">
      {/* Editorial header */}
      <header className="border-b border-charcoal-border/80 bg-charcoal/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
          <div>
            <Reveal>
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Atelier Studio</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-bone sm:text-6xl lg:text-7xl">
                Custom Designer
              </h1>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="max-w-xs text-xs leading-relaxed text-bone-muted">
              Choose a T-shirt style and size, then position your artwork before ordering.
            </p>
          </Reveal>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {!user && (
          <Reveal className="mb-8">
            <div className="border border-crimson/40 bg-crimson/10 px-5 py-4 text-xs font-semibold text-bone flex items-center gap-3 rounded-sm">
              <span className="text-crimson font-bold text-sm">✦</span> Log in to save custom designs and upload high-res artwork to your profile.
            </div>
          </Reveal>
        )}

        {/* Step rail */}
        <Reveal className="mb-10">
          <ol className="grid grid-cols-2 gap-px overflow-hidden border border-charcoal-border bg-charcoal-border sm:grid-cols-4 rounded-sm">
            {steps.map(s => (
              <li key={s.n} className={cn('flex items-center gap-3 bg-charcoal px-5 py-4', s.done && 'bg-charcoal/80 border-b-2 border-crimson')}>
                <span className={cn('font-mono text-xs font-bold', s.done ? 'text-crimson' : 'text-bone-muted')}>{s.n}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-bone">{s.label}</span>
                {s.done && <Check className="ml-auto h-4 w-4 text-crimson" />}
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Preview Canvas */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-bone-muted">Print placement preview</p>
                <p className="mt-1 text-xs text-bone-muted">Choose the exact garment from the style cards.</p>
              </div>
              <span className="border border-charcoal-border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-crimson-light">{activeSide} view</span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {([
                { side: 'front' as const, label: '01 / Front', present: !!frontArtworkUrl },
                { side: 'back' as const, label: '02 / Back', present: !!backArtworkUrl },
              ]).map(view => (
                <button
                  key={view.side}
                  type="button"
                  aria-pressed={activeSide === view.side}
                  disabled={view.side === 'back' && !selectedStyle.backFile}
                  onClick={() => { if (view.side === 'front' || selectedStyle.backFile) setActiveSide(view.side); }}
                  className={cn(
                    'flex items-center justify-between border px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
                    activeSide === view.side ? 'border-gold bg-charcoal text-bone' : 'border-charcoal-border bg-dark/70 text-bone-muted hover:border-bone-muted',
                    view.side === 'back' && !selectedStyle.backFile && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <span>{view.label}</span>
                  <span className={cn('h-1.5 w-1.5 rounded-full', view.present ? 'bg-emerald-400' : 'bg-neutral-600')} />
                </button>
              ))}
            </div>

            <div
              className="relative mx-auto aspect-square w-full max-w-[34rem] overflow-hidden border border-charcoal-border rounded-sm shadow-2xl touch-none select-none bg-charcoal"
              onDragOver={event => event.preventDefault()}
              onDrop={handleDrop}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                key={stylePreviewImage}
                src={stylePreviewImage}
                alt={selectedTShirtName + ' ' + activeSide + ' view'}
                className="absolute inset-0 h-full w-full select-none object-contain p-2"
                draggable={false}
              />

              <div
                ref={canvasRef}
                className="absolute left-[27%] top-[23%] z-10 h-[57%] w-[46%] overflow-visible touch-none"
                aria-label={activeSide === 'front' ? 'Front print placement area' : 'Back print placement area'}
              >
                {/* Print area guide boundary */}
                <div className="pointer-events-none absolute inset-0 border border-white/20 border-dashed opacity-45" />

                {activeArtworkUrl && (
                  <div
                    ref={artworkBoxRef}
                    className={cn(
                      'absolute select-none touch-none',
                      interactionMode === 'drag' ? 'cursor-grabbing' : 'cursor-grab'
                    )}
                    style={{
                      left: (transform.x * 100) + '%',
                      top: (transform.y * 100) + '%',
                      width: (65 * transform.scale) + '%',
                      transform: 'translate(-50%, -50%) rotate(' + transform.rotation + 'deg) scaleX(' + (transform.flipX ? -1 : 1) + ') scaleY(' + (transform.flipY ? -1 : 1) + ')',
                    }}
                    onPointerDown={handleArtworkPointerDown}
                  >
                    {/* Bounding box with visible border */}
                    <div className="relative border border-dashed border-white/80 p-0.5 shadow-[0_0_12px_rgba(0,0,0,0.85)]">
                      <img
                        ref={imgRef}
                        src={activeArtworkUrl}
                        alt={activeArtworkName || 'Your artwork'}
                        className="w-full h-auto object-contain pointer-events-none select-none drop-shadow-xl"
                        draggable={false}
                      />

                      {/* Clearly visible, touch-friendly corner resize handle */}
                      <div
                        role="button"
                        aria-label="Resize artwork handle"
                        title="Drag to resize"
                        className="absolute -bottom-4 -right-4 z-30 flex h-11 w-11 items-center justify-center cursor-nwse-resize touch-none select-none"
                        onPointerDown={handleResizePointerDown}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-charcoal border-2 border-[#D4AF37] shadow-[0_2px_10px_rgba(0,0,0,0.85)] hover:scale-115 active:scale-125 transition-transform">
                          <Maximize2 className="h-3.5 w-3.5 rotate-90 text-charcoal" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <span className="pointer-events-none absolute left-3 top-3 border border-white/20 bg-black/65 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-white shadow-sm">
                {selectedTShirtName} · {activeSide}
              </span>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-bone-muted">Select Front or Back, upload your artwork, then drag the artwork or its corner handle to position and resize. Supports touch drag, resize handle, pinch-to-zoom, and range sliders (0.2–2.4×).</p>

            {activeArtworkUrl && (
              <div className="mt-4 space-y-4 border border-charcoal-border bg-charcoal p-4 rounded-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-bone">Artwork controls</p>
                  <span className="text-[10px] font-mono text-bone-muted">{Math.round(transform.scale * 100)}% · {Math.round(transform.rotation)}°</span>
                </div>

                <div>
                  <label htmlFor="artwork-scale" className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-bone-muted">
                    <span>Size / scale (0.2–2.4×)</span><span>{Math.round(transform.scale * 100)}%</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" aria-label="Decrease artwork size" onClick={() => setTransform(previous => ({ ...previous, scale: Math.max(0.2, Number((previous.scale - 0.1).toFixed(2))) }))} className="border-charcoal-border text-bone hover:border-crimson"><ZoomOut className="h-4 w-4" /></Button>
                    <input id="artwork-scale" aria-label="Artwork size" type="range" min="0.2" max="2.4" step="0.05" value={Math.min(2.4, Math.max(0.2, transform.scale))} onChange={event => setTransform(previous => ({ ...previous, scale: Number(event.target.value) }))} className="w-full accent-crimson" />
                    <Button type="button" variant="outline" size="sm" aria-label="Increase artwork size" onClick={() => setTransform(previous => ({ ...previous, scale: Math.min(2.4, Number((previous.scale + 0.1).toFixed(2))) }))} className="border-charcoal-border text-bone hover:border-crimson"><ZoomIn className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-bone-muted"><span>20% (Subtle)</span><span>240% (Oversized)</span></div>
                </div>

                <div>
                  <label htmlFor="artwork-rotation" className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-bone-muted">
                    <span>Rotation</span><span>{Math.round(transform.rotation)}°</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" aria-label="Rotate artwork left 15 degrees" onClick={() => setTransform(previous => ({ ...previous, rotation: previous.rotation - 15 }))} className="border-charcoal-border text-bone hover:border-crimson"><RotateCcw className="h-4 w-4" /></Button>
                    <input id="artwork-rotation" aria-label="Artwork rotation" type="range" min="-180" max="180" step="1" value={Math.max(-180, Math.min(180, transform.rotation))} onChange={event => setTransform(previous => ({ ...previous, rotation: Number(event.target.value) }))} className="w-full accent-crimson" />
                    <Button type="button" variant="outline" size="sm" aria-label="Rotate artwork right 15 degrees" onClick={() => setTransform(previous => ({ ...previous, rotation: previous.rotation + 15 }))} className="border-charcoal-border text-bone hover:border-crimson"><RotateCw className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="artwork-position-x" className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-bone-muted"><span>Horizontal position</span><span>{Math.round(transform.x * 100)}%</span></label>
                    <input id="artwork-position-x" aria-label="Horizontal position" type="range" min="0" max="1" step="0.01" value={transform.x} onChange={event => setTransform(previous => ({ ...previous, x: Number(event.target.value) }))} className="w-full accent-crimson" />
                  </div>
                  <div>
                    <label htmlFor="artwork-position-y" className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-bone-muted"><span>Vertical position</span><span>{Math.round(transform.y * 100)}%</span></label>
                    <input id="artwork-position-y" aria-label="Vertical position" type="range" min="0" max="1" step="0.01" value={transform.y} onChange={event => setTransform(previous => ({ ...previous, y: Number(event.target.value) }))} className="w-full accent-crimson" />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-bone-muted">Placement presets</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: 'Left chest', x: 0.73, y: 0.24, scale: 0.55 },
                      { label: 'Right chest', x: 0.27, y: 0.24, scale: 0.55 },
                      { label: 'Center chest', x: 0.5, y: 0.37, scale: 0.85 },
                      { label: 'Large front', x: 0.5, y: 0.45, scale: 1.45 },
                      { label: 'Lower center', x: 0.5, y: 0.76, scale: 0.85 },
                      { label: 'Fit print area', x: 0.5, y: 0.5, scale: 1.5 },
                    ].map(preset => (
                      <button key={preset.label} type="button" onClick={() => {
                        if (preset.label === 'Fit print area' && canvasRef.current && imgRef.current?.naturalWidth && imgRef.current?.naturalHeight) {
                          const area = canvasRef.current.getBoundingClientRect();
                          const image = imgRef.current;
                          const defaultWidth = area.width * 0.65;
                          const defaultHeight = defaultWidth * (image.naturalHeight / image.naturalWidth);
                          const fittedScale = Math.min(2.4, Math.max(0.2, Math.min(area.width * 0.94 / defaultWidth, area.height * 0.94 / defaultHeight)));
                          setTransform(previous => ({ ...previous, x: 0.5, y: 0.5, scale: Number(fittedScale.toFixed(2)) }));
                        } else {
                          setTransform(previous => ({ ...previous, x: preset.x, y: preset.y, scale: preset.scale }));
                        }
                      }} className="border border-charcoal-border bg-dark px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-bone-muted transition-colors hover:border-crimson hover:text-bone">
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-charcoal-border pt-3">
                  <Button type="button" variant="outline" size="sm" aria-label="Flip artwork horizontally" onClick={() => setTransform(previous => ({ ...previous, flipX: !previous.flipX }))} className="border-charcoal-border text-bone hover:border-crimson">Flip H</Button>
                  <Button type="button" variant="outline" size="sm" aria-label="Flip artwork vertically" onClick={() => setTransform(previous => ({ ...previous, flipY: !previous.flipY }))} className="border-charcoal-border text-bone hover:border-crimson">Flip V</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTransform({ x: 0.5, y: 0.4, scale: 1, rotation: 0, flipX: false, flipY: false })} className="border-charcoal-border text-bone hover:border-crimson"><RotateCcw className="mr-1 h-4 w-4" /> Reset</Button>
                  <button type="button" onClick={() => {
                    if (activeSide === 'front') {
                      setFrontArtworkUrl(null);
                      setFrontArtworkName('');
                      setFrontTransform({ x: 0.5, y: 0.4, scale: 1, rotation: 0, flipX: false, flipY: false });
                    } else {
                      setBackArtworkUrl(null);
                      setBackArtworkName('');
                      setBackTransform({ x: 0.5, y: 0.4, scale: 1, rotation: 0, flipX: false, flipY: false });
                    }
                  }} className="ml-auto text-[10px] font-bold uppercase tracking-[0.15em] text-crimson-light transition-colors hover:text-bone">
                    Remove {activeSide} artwork
                  </button>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-bone-muted"><Move className="h-3 w-3 text-crimson" /> Drag on the shirt or use sliders for precise placement.</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-8">
            {/* Garment */}
            <Reveal>
              <StepHeading n="01" title="Choose T-Shirt Style" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CUSTOM_TSHIRT_STYLES.map(style => {
                  const optionGarment = garments.find(item => item.slug === style.slug);
                  const selected = selectedStyleSlug === style.slug;
                  return (
                    <button
                      key={style.slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedStyleSlug(style.slug);
                        setActiveSide('front');
                        if (!style.backFile) {
                          setBackArtworkUrl(null);
                          setBackArtworkName('');
                          setBackTransform({ x: 0.5, y: 0.4, scale: 1, rotation: 0 });
                        }
                      }}
                      className={cn(
                        'overflow-hidden border text-left transition-all rounded-sm bg-charcoal',
                        selected ? 'border-crimson bg-charcoal-light shadow-md' : 'border-charcoal-border hover:border-bone-muted'
                      )}
                    >
                      <div className="aspect-square overflow-hidden bg-white">
                        <img
                          src={style.frontFile}
                          alt={style.name + ' custom T-shirt'}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-metallic-silver">{style.name}</p>
                        <p className="mt-1 text-xs font-mono text-bone-muted">{optionGarment ? formatPrice(optionGarment.base_price) : 'Awaiting catalog setup'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!garment && (
                <p className="mt-3 border border-gold/30 bg-charcoal px-3 py-2 text-[10px] leading-relaxed text-bone-muted">
                  This style is not enabled for ordering yet. The custom T-shirt catalog migration must be applied before orders can be placed for it.
                </p>
              )}
            </Reveal>

            {/* Size */}
            <Reveal>
              <StepHeading n="02" title="Select Size" />
              <div className="mt-4 flex flex-wrap gap-2">
                {sizes.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.label)}
                    className={cn(
                      'min-w-[3.5rem] border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-sm',
                      size === s.label ? 'border-crimson bg-crimson text-bone shadow-md' : 'border-charcoal-border bg-charcoal text-bone-muted hover:border-bone hover:text-bone'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Reveal>

            {/* Upload the artwork for the selected side */}
            <Reveal>
              <StepHeading n="03" title="Upload Artwork File" />
              <div className="mt-4 flex items-center justify-between gap-3 border border-charcoal-border bg-charcoal/60 p-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-bone-muted">Currently editing</p>
                  <p className="mt-1 text-sm font-semibold text-bone">{activeSide === 'front' ? 'Front of T-shirt' : 'Back of T-shirt'}</p>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-bone-muted">{activeArtworkUrl ? 'Artwork added' : 'No artwork yet'}</span>
              </div>
              {activeArtworkUrl ? (
                <div className="mt-3 flex flex-col gap-3 border border-emerald-500/30 bg-emerald-950/20 p-4 rounded-sm text-xs text-emerald-400 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-center gap-2"><Check className="h-4 w-4 shrink-0" /><span className="truncate">{activeArtworkName || 'Artwork uploaded for ' + activeSide}</span></span>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300">Ready to position</span>
                </div>
              ) : (
                <label className="mt-3 flex cursor-pointer items-center justify-center border-2 border-dashed border-charcoal-border bg-charcoal/30 py-10 text-xs font-bold uppercase tracking-wider text-bone-muted transition-colors hover:border-crimson hover:text-bone rounded-sm">
                  <Upload className="mr-2 h-5 w-5 text-crimson" strokeWidth={1.5} />
                  {uploading ? 'Uploading artwork…' : 'Upload artwork for ' + activeSide}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={uploading} onChange={handleFileInput} />
                </label>
              )}
              <p className="mt-3 text-[10px] leading-relaxed text-bone-muted">PNG or JPG · Up to 25 MB per image. Front and back artwork are stored separately; switch views above to upload a different file and set its own position, scale and rotation.</p>
            </Reveal>

            {error && <p className="text-xs font-bold text-crimson-light bg-crimson/10 border border-crimson/30 p-3 rounded-sm">{error}</p>}

            {/* Add to cart */}
            <Reveal className="border-t border-charcoal-border pt-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-bone-muted">Atelier Total</span>
                <span className="font-mono text-2xl font-bold text-bone">{formatPrice(garment?.base_price ?? 0)}</span>
              </div>
              <Button onClick={handleAddToCart} disabled={(!frontArtworkUrl && !backArtworkUrl) || !garment || !selectedStyle.frontFile} size="lg" className="mt-5 w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-widest py-4">
                {added ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" /> Add Custom Order to Bag
                  </>
                )}
              </Button>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeading({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs font-bold text-crimson">{n}</span>
      <span className="h-px w-5 bg-crimson/40" />
      <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.25em] text-bone">{title}</h3>
    </div>
  );
}
