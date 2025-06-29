import {
  useEffect,
  useRef,
  memo,
  type PropsWithChildren,
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

  /* mount & resize (Hi-DPI safe) */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      cvs.width  = window.innerWidth  * dpr;
      cvs.height = window.innerHeight * dpr;
      cvs.style.width  = "100vw";
      cvs.style.height = "100vh";
      meshRef.current?.setCanvasSize(cvs.width, cvs.height);
    };
    resize();

    /* draw once */
    const mesh = new MeshGradient();
    mesh.initGradient("#meshCanvas", palette);
    meshRef.current = mesh;

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      mesh.disconnect();
    };
  }, []);

  /* recolour whenever the palette updates */
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.changeGradientColors(palette);
    meshRef.current.reGenerateCanvas();   // single redraw – still static
  }, [palette]);

  /* ── render ── */
  return (
    <canvas
      id="meshCanvas"
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,             // above <body>, beneath UI layers
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
      }}
    />
  );
}

export const MeshBackdrop = memo(MeshBackdropBase);
