import { useEffect, useState } from "react";
import ColorThief from "colorthief";    // ≈8 kB gzip  [oai_citation:1‡npmjs.com](https://www.npmjs.com/package/colorthief?utm_source=chatgpt.com)

export function useCoverPalette(
  getPalette: (img: HTMLImageElement) => string[] = defaultGetPalette,
) {
  const [palette, setPalette] = useState<string[]>([
    "#111", "#222", "#333", "#444",
  ]); // safe start

  useEffect(() => {
    const handler = (e: Event) => {
      const { url } = (e as CustomEvent<{ url: string }>).detail;
      if (!url) return;

      const img = new Image();
      img.crossOrigin = "anonymous"; // relies on cached blob → no new HTTP
      img.onload = () => {
        setPalette(getPalette(img));
      };
      img.src = url;
    };

    window.addEventListener("coverChanged", handler);
    return () => window.removeEventListener("coverChanged", handler);
  }, [getPalette]);

  return palette;
}

/** Default palette extractor = top 7 colours (duplicates OK) */
function defaultGetPalette(img: HTMLImageElement) {
  const thief = new ColorThief();
  const pal = thief.getPalette(img, 7) as number[][];
  return pal.map(
    ([r, g, b]) => `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
  );
}
