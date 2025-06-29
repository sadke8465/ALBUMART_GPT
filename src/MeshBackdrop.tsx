import {
  useEffect,
  useRef,
  memo,
  type PropsWithChildren,
  useCallback,
} from "react";
import MeshGradient from "mesh-gradient.js";
import { useCoverPalette } from "./useCoverPalette";

/* ───────── props ───────── */
export interface MeshBackdropProps {
  /** Current cover-art URL (CORS-friendly). */
  src: string | null;
  /** Optional custom colour-extraction function. */
  getPalette?: (img: HTMLImageElement) => string[];
  /** CSS blur radius in px (default = 80). */
  blur?: number;
  /** Animation speed multiplier (default = 1). */
  speed?: number;
}

/* ───────── component ───────── */
function MeshBackdropBase({
  src,
  getPalette,
  blur = 80,
  speed = 1,
}: PropsWithChildren<MeshBackdropProps>) {
  const palette   = useCoverPalette(src, getPalette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef   = useRef<typeof MeshGradient | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  /* Optimized resize handler with throttling */
  const handleResize = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth * dpr;
    const height = window.innerHeight * dpr;
    
    // Only resize if dimensions actually changed
    if (cvs.width !== width || cvs.height !== height) {
      cvs.width = width;
      cvs.height = height;
      cvs.style.width = "100vw";
      cvs.style.height = "100vh";
      meshRef.current?.setCanvasSize(width, height);
    }
  }, []);

  /* mount & resize (Hi-DPI safe) - optimized */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // Initial setup
    handleResize();

    /* draw once */
    const mesh = new MeshGradient();
    mesh.initGradient("#meshCanvas", palette);
    meshRef.current = mesh;

    // Use ResizeObserver for more efficient resize detection
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(() => {
        // Throttle resize events
        if (resizeObserverRef.current) {
          clearTimeout((resizeObserverRef.current as any).timeout);
          (resizeObserverRef.current as any).timeout = setTimeout(handleResize, 100);
        }
      });
      resizeObserverRef.current.observe(document.body);
    } else {
      // Fallback to window resize for older browsers
      window.addEventListener("resize", handleResize, { passive: true });
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      } else {
        window.removeEventListener("resize", handleResize);
      }
      mesh.disconnect();
    };
  }, [handleResize]);

  /* recolour whenever the palette updates - optimized */
  useEffect(() => {
    if (!meshRef.current || !palette.length) return;
    
    // Batch palette updates to reduce redraws
    requestAnimationFrame(() => {
      if (meshRef.current) {
        meshRef.current.changeGradientColors(palette);
        meshRef.current.reGenerateCanvas();
      }
    });
  }, [palette]);

  /* ── render ── */
  return (
    <canvas
      id="meshCanvas"
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
        willChange: "transform", // Optimize for animations
      }}
    />
  );
}

export const MeshBackdrop = memo(MeshBackdropBase);
