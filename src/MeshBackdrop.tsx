import {
  useEffect,
  useRef,
  useState,
  memo,
  type PropsWithChildren,
} from "react";
import MeshGradient from "mesh-gradient.js";
import { useCoverPalette } from "./useCoverPalette";

export interface MeshBackdropProps {
  getPalette?: (img: HTMLImageElement) => string[];
  blur?: number;          // default 80
  fps?: number;           // default 30
}

function MeshBackdropBase({
  getPalette,
  blur = 80,
  fps = 30,
}: PropsWithChildren<MeshBackdropProps>) {
  const palette   = useCoverPalette(getPalette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef   = useRef<MeshGradient | null>(null);
  const lastFrame = useRef(0);

  const isActive = () =>
    !document.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────── init / resize ─────────── */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    cvs.width  = window.innerWidth;
    cvs.height = window.innerHeight;

    const mesh = new MeshGradient();

    /* 🔑 FIX ① – pass selector string, not element */
    mesh.initGradient("#meshCanvas", palette);

    meshRef.current = mesh;

    const onResize = () => {
      cvs.width  = window.innerWidth;
      cvs.height = window.innerHeight;
      mesh.setCanvasSize(cvs.width, cvs.height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      mesh.disconnect();
    };
  }, []); // mount once

  /* ─────────── recolour every cover swap ─────────── */
  useEffect(() => {
    meshRef.current?.changeGradientColors(palette);
  }, [palette]);

  /* ─────────── animation loop (20 s drift @ ≤ fps) ─────────── */
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
        mesh.uniforms.u_time.value += dt / 1000;
        mesh.reGenerateCanvas();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [fps]);

  /* ─────────── JSX ─────────── */
  return (
    <canvas
      id="meshCanvas"            /* 🔑 FIX ② – give canvas an id the lib can query */
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
      }}
    />
  );
}

export const MeshBackdrop = memo(MeshBackdropBase);
