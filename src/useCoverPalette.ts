import { useEffect, useState } from "react";
import ColorThief from "colorthief";   //  npm i colorthief
import chroma     from "chroma-js";    //  npm i chroma-js

/**
 * Extracts a polished 4-colour palette from an <img>.
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

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    const extract = () => {
      /* 1. base clusters */
      const raw: [number, number, number][] = override
        ? (override(img) as any)
        : (new ColorThief().getPalette(img, 8) as any);

      let cols = raw.map(c => chroma(...c));

      /* 2. ditch low-saturation greys */
      cols = cols.filter(c => c.saturation() > 0.15);
      if (cols.length < 3) cols = raw.map(c => chroma(...c)); // fallback

      /* 3. sort bright → dark */
      cols.sort((a, b) => b.luminance() - a.luminance());
      const light  = cols[0];
      const mid    = cols[Math.floor(cols.length / 2)];
      const shadow = cols[cols.length - 1];

      /* 4. accent = most different from mid in LAB */
      const accent =
        cols
          .filter(c => c !== mid)
          .sort(
            (a, b) =>
              chroma.distance(b, mid, "lab") - chroma.distance(a, mid, "lab"),
          )[0] || light;

      /* 5. polish */
      setPalette([
        shadow.darken(0.4).hex(),  // deeper shadow
        mid.hex(),                 // body colour
        accent.saturate(0.8).hex(),// punchy accent
        light.brighten(0.3).hex(), // highlight
      ]);
    };

    if (img.complete) extract();
    else img.onload = extract;
  }, [src, override]);

  return palette;
}
