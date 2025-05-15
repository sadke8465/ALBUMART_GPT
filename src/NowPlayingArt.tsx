"use client"

import { useEffect, useState, useRef } from "react"
import styles from "./page.module.css"

/* helper: convert remote cover URL → CORS-safe blob URL so ColorThief works */
async function toBlobURL(src: string) {
  const blob = await fetch(src, { mode: "cors" }).then(r => r.blob())
  return URL.createObjectURL(blob)
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
  ])

  const lastAlbumArtRef      = useRef("/placeholder.svg?height=500&width=775")
  const [transitioning, setTransitioning] = useState(false)
  const currentTrackIdRef    = useRef("")
  const transitionTimerRef   = useRef<NodeJS.Timeout | null>(null)

  /* zoom animation refs (kept from your original) */
  const [zoomActive, setZoomActive]   = useState(false)
  const [zoomQuadrant, setZoomQuadrant] = useState(0)
  const zoomTimerRef          = useRef<NodeJS.Timeout | null>(null)
  const zoomKeyPressedRef     = useRef(false)
  const autoZoomIntervalRef   = useRef<NodeJS.Timeout | null>(null)

  const lastfmURL =
    "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=Noamsadi95&api_key=f12a1d5a9aad4c0d570403a0aabc9f61&format=json"

  /* ───────────── album-art resolver (unchanged logic) ───────────── */
  async function getAlbumArt(
    artist: string,
    title: string,
    album: string,
    trackObj: any,
  ) {
    const pickXL = (list: any[]) =>
      list?.find((img) => img.size === "extralarge")?.["#text"] || ""

    const img1 = pickXL(trackObj?.image || [])
    if (img1) return img1

    try {
      const albumURL =
        `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=${encodeURIComponent(
          artist,
        )}&album=${encodeURIComponent(album)}&api_key=f12a1d5a9aad4c0d570403a0aabc9f61&format=json`
      const albumImg = pickXL((await fetch(albumURL).then(r => r.json())).album?.image || [])
      if (albumImg) return albumImg
    } catch {}

    try {
      const artistURL =
        `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
          artist,
        )}&api_key=f12a1d5a9aad4c0d570403a0aabc9f61&format=json`
      const artistImg = pickXL((await fetch(artistURL).then(r => r.json())).artist?.image || [])
      if (artistImg) return artistImg
    } catch {}

    return "/placeholder.svg?height=500&width=775"
  }

  /* ───────────── helper: push new track & cross-fade ───────────── */
  const addTrack = (title: string, artist: string, img: string) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    setTransitioning(true)

    setTracks(cur => [...cur, { title, artist, imageUrl: img, key: `${title}-${artist}-${Date.now()}` }])

    transitionTimerRef.current = setTimeout(() => {
      setTracks(cur => [cur[cur.length - 1]])
      setTransitioning(false)
    }, 1000)
  }

  /* ───────────── dispatch coverChanged for MeshBackdrop ───────────── */
  async function fireCoverChanged(rawImg: string) {
    try {
      const safeURL = await toBlobURL(rawImg)
      window.dispatchEvent(
        new CustomEvent("coverChanged", { detail: { url: safeURL } }),
      )
    } catch (e) {
      console.warn("coverChanged dispatch failed:", e)
    }
  }

  /* ───────────── poll Last.fm every 5 s ───────────── */
  async function updateNowPlaying() {
    try {
      const data = await fetch(lastfmURL).then(r => r.json())
      const now = data?.recenttracks?.track?.find(
        (t: any) => t["@attr"]?.nowplaying === "true",
      )
      if (now) {
        const artist = now.artist["#text"]
        const title  = now.name
        const album  = now.album["#text"]
        const id     = `${artist}-${title}`

        if (id !== currentTrackIdRef.current) {
          const rawImg = await getAlbumArt(artist, title, album, now)
          if (!rawImg.includes("placeholder")) lastAlbumArtRef.current = rawImg

          addTrack(title, artist, rawImg)
          currentTrackIdRef.current = id
          fireCoverChanged(rawImg)
        }
      } else if (currentTrackIdRef.current !== "not-playing") {
        addTrack("Not Playing", "Check back later", lastAlbumArtRef.current)
        currentTrackIdRef.current = "not-playing"
      }
    } catch (e) {
      console.error("Last.fm fetch error:", e)
    }
  }

  /* ───────────── zoom animation helpers (kept) ───────────── */
  const startZoom = () => {
    if (zoomActive) return
    setZoomActive(true); setZoomQuadrant(1)

    const step = () =>
      setZoomQuadrant(q => (q >= 4 ? (setTimeout(() => setZoomActive(false), 3000), 0) : q + 1))

    const dur = 12000
    for (let i = 1; i <= 4; i++) zoomTimerRef.current = setTimeout(step, i * dur)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "a" && !zoomKeyPressedRef.current) {
      zoomKeyPressedRef.current = true; startZoom()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "a") zoomKeyPressedRef.current = false
  }

  /* ───────────── lifecycle setup ───────────── */
  useEffect(() => {
    updateNowPlaying()
    const poll = setInterval(updateNowPlaying, 5000)
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKeyUp)
    const autoStart = setTimeout(startZoom, 2000)
    autoZoomIntervalRef.current = setInterval(startZoom, 120000)

    return () => {
      clearInterval(poll)
      clearTimeout(autoStart)
      if (autoZoomIntervalRef.current) clearInterval(autoZoomIntervalRef.current)
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  /* ───────────── helpers for classes ───────────── */
  const zoomClass = zoomActive ? `${styles.zooming} ${styles[`quadrant${zoomQuadrant}`]}` : ""

  /* ───────────── render ───────────── */
  return (
    <main className={styles.main}>
      <div className={styles.artContainer}>
        {tracks.map((t, i) => (
          <div
            key={`bg-${t.key}`}
            className={`${styles.backgroundArt} ${
              i === tracks.length - 1 ? styles.topBackgroundLayer : styles.bottomBackgroundLayer
            }`}
            style={{ backgroundImage: `url(${t.imageUrl})` }}
          />
        ))}

        <div
          className={`${styles.imageWrapper} ${
            transitioning ? styles.transitioning : ""
          } ${zoomClass}`}
        >
          {tracks.map((t, i) => (
            <div
              key={t.key}
              className={`${styles.imageLayer} ${
                i === tracks.length - 1 ? styles.topLayer : styles.bottomLayer
              }`}
            >
              <img
                src={t.imageUrl}
                width={775}
                height={500}
                alt="Album Art"
                className={styles.albumImage}
                style={{ objectFit: "fill" }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
