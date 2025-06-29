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
  getPalette?: (img: HTMLImageElement) => string[];
  blur?: number; // px  (default 80)
}

/* ───────── component ───────── */
function MeshBackdropBase({
  getPalette,
  blur = 80,
}: PropsWithChildren<MeshBackdropProps>) {
  const palette   = useCoverPalette(getPalette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef   = useRef<MeshGradient | null>(null);

  /* ── mount & resize (Hi-DPI-safe) ── */
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

    const mesh = new MeshGradient();
    mesh.initGradient("#meshCanvas", palette); // draw once
    meshRef.current = mesh;

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      mesh.disconnect();
    };
  }, []); // mount once

  /* recolor whenever palette changes (still just one draw) */
  useEffect(() => {
    meshRef.current?.changeGradientColors(palette);
    meshRef.current?.reGenerateCanvas();      // redraw with new colors
  }, [palette]);

  /* ── render ── */
  return (
    <canvas
      id="meshCanvas"
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,              // sits above <body>, beneath UI layers
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
      }}
    />
  );
}

export const MeshBackdrop = memo(MeshBackdropBase);
