import { useEffect, useState, useRef } from "react";
import ColorThief from "colorthief";   //  npm i colorthief
import chroma     from "chroma-js";    //  npm i chroma-js

/**
 * Extracts a polished 4-colour palette from an <img>.
 * Optimized for performance on weak machines.
 *
 * @param src        image URL (must be CORS-accessible!)
 * @param override   optional custom extractor – receives the loaded <img>,
 *                   returns an array of HEX strings you want to use instead.
 */
export function useCoverPalette(
  src: string | null | undefined,
  override?: (img: HTMLImageElement) => string[],
): string[] {
  const [palette, setPalette] = useState<string[]>([
    "#2e2e2e", "#4a4a4a", "#666666", "#8a8a8a",
  ]);
  
  const lastSrcRef = useRef<string | null>(null);
  const colorThiefRef = useRef<ColorThief | null>(null);

  useEffect(() => {
    if (!src || src === lastSrcRef.current) return;
    
    lastSrcRef.current = src;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Optimize image loading for weak machines
    img.loading = "lazy";
    
    const extract = () => {
      try {
        /* 1. base clusters - with caching */
        if (!colorThiefRef.current) {
          colorThiefRef.current = new ColorThief();
        }
        
        const raw: [number, number, number][] = override
          ? (override(img) as any)
          : (colorThiefRef.current.getPalette(img, 6) as any); // Reduced from 8 to 6 for performance

        if (!raw || raw.length === 0) return;

        let cols = raw.map(c => chroma(...c));

        /* 2. ditch low-saturation greys - optimized */
        cols = cols.filter(c => c.get('hsl.s') > 0.12); // Slightly lower threshold
        if (cols.length < 3) cols = raw.map(c => chroma(...c)); // fallback

        /* 3. sort bright → dark - optimized */
        cols.sort((a, b) => b.luminance() - a.luminance());
        
        // Take fewer colors for better performance
        const light  = cols[0];
        const mid    = cols[Math.floor(cols.length / 2)];
        const shadow = cols[cols.length - 1];

        /* 4. accent = most different from mid in LAB - simplified */
        const accent = cols.find(c => c !== mid) || light;

        /* 5. polish - with reduced operations */
        setPalette([
          shadow.darken(0.3).hex(),  // Reduced from 0.4
          mid.hex(),
          accent.saturate(0.6).hex(), // Reduced from 0.8
          light.brighten(0.2).hex(),  // Reduced from 0.3
        ]);
      } catch (error) {
        console.warn("Palette extraction failed:", error);
      }
    };

    if (img.complete) {
      extract();
    } else {
      img.onload = extract;
      img.onerror = () => {
        console.warn("Failed to load image for palette extraction:", src);
      };
    }
  }, [src, override]);

  return palette;
}
