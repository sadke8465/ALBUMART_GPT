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
  blur?:   number;  // px   (default 80)
  fps?:    number;  // cap  (default 30)
  speed?:  number;  // 1 = original, 10 = 10× faster, 0.5 = slower
}

/* ───────── component ───────── */
function MeshBackdropBase({
  getPalette,
  blur  = 80,
  fps   = 30,
  speed = 1,
}: PropsWithChildren<MeshBackdropProps>) {
  const palette   = useCoverPalette(getPalette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef   = useRef<MeshGradient | null>(null);

  /* pause when tab hidden or user prefers-reduced-motion */
  const isActive = () =>
    !document.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    mesh.initGradient("#meshCanvas", palette);
    meshRef.current = mesh;

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      mesh.disconnect();
    };
  }, []); // mount once

  /* recolour whenever palette changes */
  useEffect(() => {
    meshRef.current?.changeGradientColors(palette);
  }, [palette]);

  /* ── animation loop: *always* advance by speed/fps per tick ── */
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const frameStep = speed / fps;          // seconds of shader-time per tick
    const frameMs   = 1000 / fps;
    let last = performance.now();
    let rafId = 0;

    const draw = (now: number) => {
      rafId = requestAnimationFrame(draw);
      if (!isActive()) return;
      if (now - last >= frameMs) {
        last = now;
        mesh.uniforms.u_time.value += frameStep;
        mesh.reGenerateCanvas();
      }
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [fps, speed]);

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
