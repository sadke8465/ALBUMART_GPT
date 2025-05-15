import {
  useEffect,
  useRef,
  useState,
  memo,
  type MutableRefObject,
  type PropsWithChildren,
} from "react";
import MeshGradient from "mesh-gradient.js";      // ≈6 kB gzip  [oai_citation:0‡GitHub](https://github.com/anup-a/mesh-gradient.js/)
import { useCoverPalette } from "./useCoverPalette";

export interface MeshBackdropProps {
  /** Utility used mainly for testing – defaults to ColorThief palette */
  getPalette?: (img: HTMLImageElement) => string[];
  /** Canvas `shadowBlur` (px) applied inside the fragment shader. Default 80. */
  blur?: number;
  /** Max frame-rate for the rAF loop. Default 30 fps. */
  fps?: number;
}

function MeshBackdropBase({
  getPalette,
  blur = 80,
  fps = 30,
}: PropsWithChildren<MeshBackdropProps>) {
  const palette = useCoverPalette(getPalette);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef = useRef<MeshGradient | null>(null);
  const lastFrame = useRef(0);

  /** Pause when tab is hidden or user asks for reduced motion */
  const isActive = () =>
    !document.hidden &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Initialise / resize
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // Full-viewport fixed canvas – sits *under* the existing layout
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;

    const mesh = new MeshGradient();
    mesh.initGradient(cvs, palette);    // first paint
    meshRef.current = mesh;

    // Resize listener
    const onResize = () => {
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
      mesh.setCanvasSize(cvs.width, cvs.height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      mesh.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // 60 s recolour hook
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.changeGradientColors(palette);
  }, [palette]);

  // Animation loop (ease-in-out, 20 s)
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let frame = 0;
    let rafId = 0;

    const loop = (t: number) => {
      if (!isActive()) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const dt = t - lastFrame.current;
      if (dt > 1000 / fps) {
        lastFrame.current = t;
        mesh.uniforms.u_time.value += dt / 1000; // seconds
        mesh.reGenerateCanvas(); // draws one frame
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafId);
  }, [fps]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
      }}
    />
  );
}

export const MeshBackdrop = memo(MeshBackdropBase);
