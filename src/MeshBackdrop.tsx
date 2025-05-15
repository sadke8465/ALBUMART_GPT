import {
  useEffect,
  useRef,
  memo,
  type PropsWithChildren,
} from "react";
import MeshGradient from "mesh-gradient.js";
import { useCoverPalette } from "./useCoverPalette";

/* ───────── component props ───────── */
export interface MeshBackdropProps {
  /** test-hook palette override */
  getPalette?: (img: HTMLImageElement) => string[];
  /** CSS blur applied to the canvas */
  blur?: number;          // default 80
  /** frame-rate cap */
  fps?: number;           // default 30
  /** animation speed multiplier (1 = original, 2 = twice as fast, 0.5 = slower) */
  speed?: number;         // default 1
}

/* ───────── functional component ───────── */
function MeshBackdropBase({
  getPalette,
  blur = 80,
  fps = 30,
  speed = 1,
}: PropsWithChildren<MeshBackdropProps>) {
  const palette   = useCoverPalette(getPalette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef   = useRef<MeshGradient | null>(null);
  const lastFrame = useRef(0);

  /* helper: should we animate this frame? */
  const isActive = () =>
    !document.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── mount / resize ───────── */
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
    resize(); // initial

    const mesh = new MeshGradient();
    mesh.initGradient("#meshCanvas", palette);
    meshRef.current = mesh;

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      mesh.disconnect();
    };
  }, []); // run once

  /* ───────── recolour on palette change ───────── */
  useEffect(() => {
    meshRef.current?.changeGradientColors(palette);
  }, [palette]);

  /* ───────── animation loop ───────── */
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let rafId = 0;
    const loop = (t: number) => {
      if (!isActive()) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      const dt = t - lastFrame.current;
      if (dt > 1000 / fps) {
        lastFrame.current = t;
        mesh.uniforms.u_time.value += (dt / 1000) * speed; // ⇐ speed tweak
        mesh.reGenerateCanvas();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [fps, speed]);

  /* ───────── JSX ───────── */
  return (
    <canvas
      id="meshCanvas"
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,              // in front of <body> but behind UI layers
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
      }}
    />
  );
}

export const MeshBackdrop = memo(MeshBackdropBase);
