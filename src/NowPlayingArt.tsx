"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { MeshBackdrop }          from "./MeshBackdrop";
import styles                    from "./page.module.css";

/* helper: convert remote cover URL → CORS-safe blob URL */
async function toBlobURL(src: string) {
  const blob = await fetch(src, { mode: "cors" }).then(r => r.blob());
  return URL.createObjectURL(blob);
}

export default function NowPlayingArt() {
  /* ───────────── state & refs ───────────── */
  const [tracks, setTracks] = useState([
    {
      title: "Not Playing",
      artist: "",
      imageUrl: "/placeholder.svg?height=500&width=775",
      key: "initial",
    },
  ]);

  const [coverUrl, setCoverUrl] = useState(
    "/placeholder.svg?height=500&width=775",
  );

  const lastAlbumArtRef        = useRef("/placeholder.svg?height=500&width=775");
  const [transitioning, setTransitioning] = useState(false);
  const currentTrackIdRef      = useRef("");
  const transitionTimerRef     = useRef<NodeJS.Timeout | null>(null);

  /* zoom animation refs */
  const [zoomActive, setZoomActive]   = useState(false);
  const [zoomQuadrant, setZoomQuadrant] = useState(0);
  const zoomTimeoutsRef        = useRef<NodeJS.Timeout[]>([]);
  const zoomKeyPressedRef      = useRef(false);
  const autoZoomIntervalRef    = useRef<NodeJS.Timeout | null>(null);

  /* blob-URL bookkeeping */
  const lastBlobUrlRef         = useRef<string | null>(null);

  /* Memoize the Last.fm URL to prevent unnecessary re-creation */
  const lastfmURL = useMemo(() => 
    "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=Noamsadi95&api_key=f12a1d5a9aad4c0d570403a0aabc9f61&format=json",
    []
  );

  /* ───────────── album-art resolver (optimized) ───────────── */
  const getAlbumArt = useCallback(async (
    artist: string,
    title: string,
    album: string,
    trackObj: any,
  ) => {
    const pickXL = (list: any[]) =>
      list?.find((img) => img.size === "extralarge")?.["#text"] || "";

    const img1 = pickXL(trackObj?.image || []);
    if (img1) return img1;

    try {
      const albumURL =
        `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${encodeURIComponent(
          artist,
        )}&album=${encodeURIComponent(album)}&api_key=f12a1d5a9aad4c0d570403a0aabc9f61&format=json`;
      const albumImg = pickXL(
        (await fetch(albumURL).then(r => r.json())).album?.image || [],
      );
      if (albumImg) return albumImg;
    } catch {}

    try {
      const artistURL =
        `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
          artist,
        )}&api_key=f12a1d5a9aad4c0d570403a0aabc9f61&format=json`;
      const artistImg = pickXL(
        (await fetch(artistURL).then(r => r.json())).artist?.image || [],
      );
      if (artistImg) return artistImg;
    } catch {}

    return "/placeholder.svg?height=500&width=775";
  }, []);

  /* ───────── addTrack + cross-fade (optimized) ───────── */
  const addTrack = useCallback((title: string, artist: string, img: string) => {
    setTracks(cur => {
      const prev = cur[cur.length - 1];
      const next = {
        title,
        artist,
        imageUrl: img,
        key: `${title}-${artist}-${Date.now()}`,
      };
      return prev ? [prev, next] : [next];
    });

    setTransitioning(true);

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setTracks(cur => [cur[cur.length - 1]]);
      setTransitioning(false);
    }, 1000);
  }, []);

  /* ───────── updateCoverUrl (optimized) ───────── */
  const updateCoverUrl = useCallback(async (rawImg: string) => {
    try {
      if (lastBlobUrlRef.current)
        URL.revokeObjectURL(lastBlobUrlRef.current);

      const safeURL = await toBlobURL(rawImg);
      lastBlobUrlRef.current = safeURL;
      setCoverUrl(safeURL);
    } catch (e) {
      console.warn("coverUrl update failed:", e);
    }
  }, []);

  /* ───────── poll Last.fm (optimized with debouncing) ───────── */
  const updateNowPlaying = useCallback(async () => {
    try {
      const data = await fetch(lastfmURL).then(r => r.json());
      const now = data?.recenttracks?.track?.find(
        (t: any) => t["@attr"]?.nowplaying === "true",
      );
      if (now) {
        const artist = now.artist["#text"];
        const title  = now.name;
        const album  = now.album["#text"];
        const id     = `${artist}-${title}`;

        if (id !== currentTrackIdRef.current) {
          const rawImg = await getAlbumArt(artist, title, album, now);
          if (!rawImg.includes("placeholder"))
            lastAlbumArtRef.current = rawImg;

          addTrack(title, artist, rawImg);
          currentTrackIdRef.current = id;
          updateCoverUrl(rawImg);
        }
      } else if (currentTrackIdRef.current !== "not-playing") {
        addTrack("Not Playing", "Check back later", lastAlbumArtRef.current);
        currentTrackIdRef.current = "not-playing";
      }
    } catch (e) {
      console.error("Last.fm fetch error:", e);
    }
  }, [lastfmURL, getAlbumArt, addTrack, updateCoverUrl]);

  /* ───────── zoom helpers (optimized) ───────── */
  const startZoom = useCallback(() => {
    if (zoomKeyPressedRef.current) return;
    
    const quadrant = Math.floor(Math.random() * 4) + 1;
    setZoomQuadrant(quadrant);
    setZoomActive(true);
    
    const timeout = setTimeout(() => {
      setZoomActive(false);
    }, 12000);
    
    zoomTimeoutsRef.current.push(timeout);
  }, []);

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'z' || e.key === 'Z') {
      zoomKeyPressedRef.current = true;
      startZoom();
    }
  }, [startZoom]);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'z' || e.key === 'Z') {
      zoomKeyPressedRef.current = false;
    }
  }, []);

  /* ───────── lifecycle setup (optimized) ───────── */
  useEffect(() => {
    updateNowPlaying();
    
    // Use a more efficient polling interval for weak machines
    const poll = setInterval(updateNowPlaying, 10000); // Increased from 5000ms
    
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    
    // Delay auto-zoom start to reduce initial load
    const autoStart = setTimeout(startZoom, 5000); // Increased from 2000ms
    autoZoomIntervalRef.current = setInterval(startZoom, 180000); // Increased from 120000ms

    return () => {
      clearInterval(poll);
      clearTimeout(autoStart);
      if (autoZoomIntervalRef.current)
        clearInterval(autoZoomIntervalRef.current);
      zoomTimeoutsRef.current.forEach(id => clearTimeout(id));
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      if (lastBlobUrlRef.current) URL.revokeObjectURL(lastBlobUrlRef.current);
    };
  }, [updateNowPlaying, onKey, onKeyUp, startZoom]);

  /* ───────── helpers for classes (memoized) ───────── */
  const zoomClass = useMemo(() => 
    zoomActive
      ? `${styles.zooming} ${styles[`quadrant${zoomQuadrant}`]}`
      : "",
    [zoomActive, zoomQuadrant]
  );

  /* ───────── render ───────── */
  return (
    <>
      {/* mesh backdrop under everything */}
      <MeshBackdrop src={coverUrl} />

      <main className={styles.main}>
        <div className={styles.artContainer}>
          {/* background stack */}
          {tracks.map((t, i) => (
            <div
              key={`bg-${t.key}`}
              className={`${styles.backgroundArt} ${
                i === tracks.length - 1
                  ? styles.topBackgroundLayer
                  : styles.bottomBackgroundLayer
              }`}
              style={{ backgroundImage: `url(${t.imageUrl})` }}
            />
          ))}

          {/* foreground image stack */}
          <div
            className={`${styles.imageWrapper} ${
              transitioning ? styles.transitioning : ""
            } ${zoomClass}`}
          >
            {tracks.map((t, i) => (
              <div
                key={t.key}
                className={`${styles.imageLayer} ${
                  i === tracks.length - 1
                    ? styles.topLayer
                    : styles.bottomLayer
                }`}
              >
                <img
                  src={t.imageUrl}
                  width={775}
                  height={500}
                  alt="Album Art"
                  decoding="async"
                  loading="lazy"
                  className={styles.albumImage}
                  style={{ objectFit: "fill" }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
